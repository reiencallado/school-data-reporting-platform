package com.cssweng.reportbuilder.service;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.ReportItem;
import com.cssweng.reportbuilder.model.ReportJob;
import com.cssweng.reportbuilder.model.ReportJobRequest;
import com.cssweng.reportbuilder.model.ReportTemplate;
import com.cssweng.reportbuilder.repository.ReportItemRepository;
import com.cssweng.reportbuilder.repository.ReportJobRepository;
import com.cssweng.reportbuilder.repository.ReportTemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SqsClient sqsClient;
    private final String QUEUE_URL = "http://localhost:4566/000000000000/my-queue.fifo";
    
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public ReportJobService(ReportJobRepository reportJobRepository, 
                            ReportItemRepository reportItemRepository,
                            ReportTemplateRepository templateRepository,
                            StorageService storageService,
                            SqsClient sqsClient) {
        this.reportJobRepository = reportJobRepository;
        this.reportItemRepository = reportItemRepository;
        this.templateRepository = templateRepository;
        this.sqsClient = sqsClient;
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

    private void processJobInBackground(UUID jobId, String reportName, String configuration, List<Map<String, String>> inputs) {
        try {
            markJobStatus(jobId, "PROCESSING", null);

            Map<String, Object> payload = new HashMap<>();
            payload.put("jobId", jobId.toString());
            payload.put("reportName", reportName);
            payload.put("configuration", configuration);
            payload.put("inputs", inputs);

            String messageBody = objectMapper.writeValueAsString(payload);

            // Push to queue
            SendMessageRequest sendMsgRequest = SendMessageRequest.builder()
                    .queueUrl(QUEUE_URL)
                    .messageGroupId("report-jobs")
                    .messageBody(messageBody)
                    .build();

            sqsClient.sendMessage(sendMsgRequest);
            System.out.println("Successfully pushed Job " + jobId + " to SQS.");

        } catch (Exception e) {
            System.err.println("Failed to queue Job " + jobId + " to SQS: " + e.getMessage());
            markJobStatus(jobId, "FAILED", null);
        }
    }

    public void handleJobCompletion(Map<String, Object> webhookPayload) {
        UUID jobId = UUID.fromString((String) webhookPayload.get("jobId"));
        String status = (String) webhookPayload.get("status");
        String fileUrl = (String) webhookPayload.get("fileUrl");
        
        ReportJob job = reportJobRepository.findById(jobId).orElseThrow();
        
        if ("DONE".equals(status)) {
            List<Map<String, Object>> results = (List<Map<String, Object>>) webhookPayload.get("results");
            if (results != null) {
                for (Map<String, Object> itemData : results) {
                    ReportItem item = new ReportItem(
                            job,
                            (String) itemData.get("studentId"),
                            (String) itemData.get("studentName")
                    );
                    item.setStatus((String) itemData.get("status"));
                    
                    if (itemData.containsKey("failureReason")) item.setFailureReason((String) itemData.get("failureReason"));
                    if (itemData.containsKey("grade")) item.setGrade((String) itemData.get("grade"));
                    if (itemData.containsKey("section")) item.setSection((String) itemData.get("section"));
                    if (itemData.containsKey("strand")) item.setStrand((String) itemData.get("strand"));
                    if (itemData.containsKey("fileUrl")) item.setFileUrl((String) itemData.get("fileUrl"));
                    
                    reportItemRepository.save(item);
                }
            }
        }
        
        markJobStatus(jobId, status, fileUrl);
    }

    public void generateSelectedZip(List<UUID> selectedItemIds, HttpServletResponse response) throws IOException {
        List<ReportItem> items = reportItemRepository.findAllById(selectedItemIds);
        
        response.setContentType("application/zip");
        response.setHeader("Content-Disposition", "attachment; filename=\"Selected_Reports.zip\"");

        try (ZipOutputStream zos = new ZipOutputStream(response.getOutputStream())) {
            for (ReportItem item : items) {
                if (item.getFileUrl() != null && "DONE".equals(item.getStatus())) {
                    try {
                        // Fetch from LocalStack S3 URL
                        byte[] fileBytes = restTemplate.getForObject(item.getFileUrl(), byte[].class);
                        
                        if (fileBytes != null) {
                            String fileUrl = item.getFileUrl();
                            String fileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
                            
                            if (fileName.contains("_")) {
                                fileName = fileName.substring(fileName.indexOf("_") + 1);
                            }

                            zos.putNextEntry(new ZipEntry(fileName));
                            zos.write(fileBytes);
                            zos.closeEntry();
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to fetch file for packaging: " + item.getFileUrl());
                    }
                }
            }
        }
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