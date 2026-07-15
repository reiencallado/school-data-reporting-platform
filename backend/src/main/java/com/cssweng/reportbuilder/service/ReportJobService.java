package com.cssweng.reportbuilder.service;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.ReportJob;
import com.cssweng.reportbuilder.model.ReportJobRequest;
import com.cssweng.reportbuilder.model.ReportTemplate;
import com.cssweng.reportbuilder.repository.ReportJobRepository;
import com.cssweng.reportbuilder.repository.ReportTemplateRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ReportJobService {

    private final ReportJobRepository reportJobRepository;
    private final ReportTemplateRepository templateRepository;
    private final StorageService storageService; 
    private final RestTemplate restTemplate;
    
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public ReportJobService(ReportJobRepository reportJobRepository, 
                            ReportTemplateRepository templateRepository,
                            StorageService storageService) {
        this.reportJobRepository = reportJobRepository;
        this.templateRepository = templateRepository;
        this.storageService = storageService;
        this.restTemplate = new RestTemplate();
    }

    public List<ReportJob> getJobsForUser(UUID userId) {
        return reportJobRepository.findByRequestedById(userId);
    }

    public ReportJob createAndQueueJob(ReportJobRequest request, AppUser user) {
        ReportTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new RuntimeException("Template not found"));

        // Save as pending
        ReportJob job = new ReportJob(template, user);
        job.setReportName(template.getName() + " Batch");
        job.setDetails(request.getDetails());
        job.setTotalCount(request.getInputs().size());
        job.setStatus("PENDING"); 
        
        ReportJob savedJob = reportJobRepository.save(job);

        broadcastUpdate(savedJob);

        processJobInBackground(savedJob.getId(), savedJob.getReportName(), template.getConfiguration(), request.getInputs());

        return savedJob;
    }

    private void processJobInBackground(UUID jobId, String reportName, String configuration, List<Map<String, String>> inputs) {
        new Thread(() -> {
            try {
                Thread.sleep(5000); // For testing, delete later
                
                markJobStatus(jobId, "PROCESSING", null);

                String nodeUrl = "http://localhost:3000/api/generate";
                
                Map<String, Object> payload = new HashMap<>();
                payload.put("jobId", jobId.toString());
                payload.put("configuration", configuration);
                payload.put("inputs", inputs);

                ResponseEntity<byte[]> response = restTemplate.postForEntity(nodeUrl, payload, byte[].class);
                byte[] zipBytes = response.getBody();

                if (zipBytes != null && response.getStatusCode().is2xxSuccessful()) {
                    
                    String filename = "batch_" + jobId + ".zip";
                    MultipartFile multipartFile = createMultipartFileAdapter(zipBytes, filename);

                    String safeName = reportName.replaceAll("[^a-zA-Z0-9\\s-]", "").trim();
                    String downloadFilename = safeName + ".zip";
                    
                    String fileUrl = storageService.uploadFileAndGetUrl(multipartFile, "reports/", downloadFilename);

                    markJobStatus(jobId, "DONE", fileUrl);
                } else {
                    markJobStatus(jobId, "FAILED", null);
                }

            } catch (Exception e) {
                System.err.println("Background processing failed for Job " + jobId + ": " + e.getMessage());
                markJobStatus(jobId, "FAILED", null);
            }
        }).start();
    }

    private void markJobStatus(UUID jobId, String status, String fileUrl) {
        ReportJob job = reportJobRepository.findById(jobId).orElseThrow();
        job.setStatus(status);
        if (fileUrl != null) {
            job.setFileUrl(fileUrl);
        }
        job.setCompletedAt(LocalDateTime.now());
        reportJobRepository.save(job);
        
        broadcastUpdate(job);
    }

    // Converts raw bytes into a MultipartFile
    private MultipartFile createMultipartFileAdapter(byte[] content, String filename) {
        return new MultipartFile() {
            @Override public String getName() { return "file"; }
            @Override public String getOriginalFilename() { return filename; }
            @Override public String getContentType() { return "application/zip"; }
            @Override public boolean isEmpty() { return content == null || content.length == 0; }
            @Override public long getSize() { return content.length; }
            @Override public byte[] getBytes() { return content; }
            @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
            @Override public void transferTo(File dest) throws IOException, IllegalStateException { Files.write(dest.toPath(), content); }
        };
    }

    // SSE Streaming
    public SseEmitter createNewEmitter() {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 min timeout
        this.emitters.add(emitter);

        emitter.onCompletion(() -> this.emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            this.emitters.remove(emitter);
        });
        emitter.onError((e) -> this.emitters.remove(emitter));

        return emitter;
    }

    private void broadcastUpdate(ReportJob job) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", job.getId());
        payload.put("status", job.getStatus());
        payload.put("totalCount", job.getTotalCount());
        payload.put("fileUrl", job.getFileUrl());

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("job-update").data(payload));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }
}