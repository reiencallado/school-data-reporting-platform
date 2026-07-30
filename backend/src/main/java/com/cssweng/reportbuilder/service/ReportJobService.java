package com.cssweng.reportbuilder.service;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.ReportItem;
import com.cssweng.reportbuilder.model.ReportJob;
import com.cssweng.reportbuilder.model.ReportJobRequest;
import com.cssweng.reportbuilder.model.ReportTemplate;
import com.cssweng.reportbuilder.repository.ReportItemRepository;
import com.cssweng.reportbuilder.repository.ReportJobRepository;
import com.cssweng.reportbuilder.repository.ReportTemplateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages the lifecycle of report generation jobs, including job creation,
 * background processing, report item persistence, file uploads, and real-time
 * status updates through Server-Sent Events (SSE).
 */
@Service
public class ReportJobService {

    private final ReportJobRepository reportJobRepository;
    private final ReportItemRepository reportItemRepository;
    private final ReportTemplateRepository templateRepository;
    private final StorageService storageService; 
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public ReportJobService(ReportJobRepository reportJobRepository, 
                            ReportItemRepository reportItemRepository,
                            ReportTemplateRepository templateRepository,
                            StorageService storageService) {
        this.reportJobRepository = reportJobRepository;
        this.reportItemRepository = reportItemRepository;
        this.templateRepository = templateRepository;
        this.storageService = storageService;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Retrieves all report generation jobs submitted by a specific user.
     * The returned list may include jobs in different states such as PENDING,
     * PROCESSING, DONE, or FAILED.
     *
     * @param userId the unique identifier of the user whose report jobs are to be retrieved
     * @return a list of {@link ReportJob} objects associated with the specified user;
     *         returns an empty list if the user has no report jobs
     */
    public List<ReportJob> getJobsForUser(UUID userId) {
        return reportJobRepository.findByRequestedById(userId);
    }

    /**
     * Retrieves all report items generated for a specific report job.
     * Each report item represents the generation result for an individual record, 
     * including its processing status, generated file URL, and any failure information.
     *
     * @param jobId the unique identifier of the report job
     * @return a list of {@link ReportItem} objects belonging to the specified
     *         report job; returns an empty list if no report items exist
     */
    public List<ReportItem> getItemsForJob(UUID jobId) {
        return reportItemRepository.findByJobId(jobId);
    }

    /**
     * Creates a new report generation job and queues it for background processing.
     *
     * This method retrieves the selected report template, creates a new report job
     * with a PENDING status, stores the request details and total number of inputs,
     * saves the job to the database, broadcasts the new job to connected clients,
     * and starts asynchronous report generation. The method returns immediately
     * without waiting for the report generation process to complete.
     *
     * @param request contains the selected template, report details, and input data
     * @param user the authenticated user requesting the report generation
     * @return the newly created report job
     * @throws RuntimeException if the specified report template does not exist
     */
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

    /**
     * Processes a report generation job asynchronously.
     *
     * This method runs in a separate thread to avoid blocking the main application.
     * It updates the job status to PROCESSING, sends the report generation request
     * to the Node.js service, processes the returned results, saves individual
     * report items, uploads generated PDF and ZIP files to storage, and updates
     * the final job status. If an error occurs during processing, the job is
     * marked as FAILED.
     *
     * @param jobId the unique identifier of the report job
     * @param reportName the name of the report used for the generated ZIP file
     * @param configuration the report template configuration sent to the generation service
     * @param inputs the collection of input records used to generate the reports
     */
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

                ResponseEntity<String> response = restTemplate.postForEntity(nodeUrl, payload, String.class);

                if (response.getBody() != null && response.getStatusCode().is2xxSuccessful()) {
                    JsonNode root = objectMapper.readTree(response.getBody());

                    // Save one ReportItem row per student
                    ReportJob job = reportJobRepository.findById(jobId).orElseThrow();
                    JsonNode resultsNode = root.get("results");
                    for (JsonNode itemNode : resultsNode) {
                        ReportItem item = new ReportItem(
                                job,
                                itemNode.get("studentId").asText(),
                                itemNode.get("studentName").asText()
                        );
                        item.setStatus(itemNode.get("status").asText());
                        if (itemNode.hasNonNull("failureReason")) {
                            item.setFailureReason(itemNode.get("failureReason").asText());
                        }
                        if (itemNode.hasNonNull("grade")) {
                            item.setGrade(itemNode.get("grade").asText());
                        }
                        if (itemNode.hasNonNull("section")) {
                            item.setSection(itemNode.get("section").asText());
                        }
                        if (itemNode.hasNonNull("strand")) {
                            item.setStrand(itemNode.get("strand").asText());
                        }

                        // Upload this student's individual PDF, if generation succeeded
                        if (itemNode.hasNonNull("pdfBase64")) {
                            byte[] pdfBytes = Base64.getDecoder().decode(itemNode.get("pdfBase64").asText());
                            String pdfFilename = "item_" + item.getId() + "_" + itemNode.get("studentId").asText() + ".pdf";
                            MultipartFile pdfFile = createMultipartFileAdapter(pdfBytes, pdfFilename, "application/pdf");
                            String itemFileUrl = storageService.uploadFileAndGetUrl(pdfFile, "reports/items/", pdfFilename);
                            item.setFileUrl(itemFileUrl);
                        }

                        reportItemRepository.save(item);
                    }

                    // Decode and upload the zip as before
                    String zipBase64 = root.get("zipBase64").asText();
                    byte[] zipBytes = Base64.getDecoder().decode(zipBase64);

                    String filename = "batch_" + jobId + ".zip";
                    MultipartFile multipartFile = createMultipartFileAdapter(zipBytes, filename, "application/zip");

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

    /**
     * Updates the status of a report job and notifies connected clients.
     *
     * This method retrieves the specified report job, updates its status, assigns
     * the generated file URL if provided, records the completion timestamp, saves
     * the updated job to the database, and broadcasts the latest job information
     * to all connected SSE clients.
     *
     * @param jobId the unique identifier of the report job
     * @param status the new status of the report job
     * @param fileUrl the URL of the generated report file, or null if no file is available
     */
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

    /**
     * Creates a MultipartFile instance from raw byte data.
     *
     * This utility method wraps a byte array in an anonymous implementation of
     * MultipartFile, allowing generated files stored in memory to be handled as
     * uploaded files. It is primarily used to upload generated PDF and ZIP files
     * through the StorageService without requiring temporary files on disk.
     *
     * @param content the file contents as a byte array
     * @param filename the name assigned to the generated file
     * @param contentType the MIME type of the file
     * @return a MultipartFile containing the provided file data
     */
    private MultipartFile createMultipartFileAdapter(byte[] content, String filename, String contentType) {
        return new MultipartFile() {
            @Override public String getName() { return "file"; }
            @Override public String getOriginalFilename() { return filename; }
            @Override public String getContentType() { return contentType; }
            @Override public boolean isEmpty() { return content == null || content.length == 0; }
            @Override public long getSize() { return content.length; }
            @Override public byte[] getBytes() { return content; }
            @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
            @Override public void transferTo(File dest) throws IOException, IllegalStateException { Files.write(dest.toPath(), content); }
        };
    }

    /**
     * Creates and registers a new Server-Sent Events (SSE) emitter.
     *
     * This method initializes a new SSE emitter with a 30-minute timeout,
     * registers it in the active emitter list, and configures callbacks to
     * automatically remove the emitter when the connection is completed,
     * times out, or encounters an error.
     *
     * @return a configured and registered SseEmitter instance for streaming
     *         report job updates to the client
     */
    public SseEmitter createNewEmitter() {
        SseEmitter emitter = new SseEmitter(1800000L);
        this.emitters.add(emitter);

        emitter.onCompletion(() -> this.emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            this.emitters.remove(emitter);
        });
        emitter.onError((e) -> this.emitters.remove(emitter));

        return emitter;
    }

    /**
     * Broadcasts the latest report job information to all connected SSE clients.
     *
     * This method creates a payload containing the report job's current status,
     * total item count, and generated file URL, then sends it to every active
     * Server-Sent Events (SSE) emitter. Emitters that fail to receive the update
     * are removed from the active emitter list.
     *
     * @param job the report job whose updated information will be broadcast to connected clients
     */
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