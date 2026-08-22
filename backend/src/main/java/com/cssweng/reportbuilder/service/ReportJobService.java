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
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
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
    private final S3Client s3Client;
    private final String QUEUE_URL = "http://localhost:4566/000000000000/my-queue.fifo";
    private static final String BUCKET_NAME = "document-maker-bucket";

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public ReportJobService(ReportJobRepository reportJobRepository,
                            ReportItemRepository reportItemRepository,
                            ReportTemplateRepository templateRepository,
                            StorageService storageService,
                            SqsClient sqsClient,
                            S3Client s3Client) {
        this.reportJobRepository = reportJobRepository;
        this.reportItemRepository = reportItemRepository;
        this.templateRepository = templateRepository;
        this.sqsClient = sqsClient;
        this.s3Client = s3Client;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Retrieves all report generation jobs submitted by a specific user.
     * The returned list may include jobs in different states such as PENDING,
     * PROCESSING, DONE, or FAILED.
     *
     * Side effects: Queries the database for report jobs associated with the provided user ID.
     * 
     * @param userId the unique identifier of the user whose report jobs are to be retrieved
     * @return a list of {@link ReportJob} objects associated with the specified user;
     *         returns an empty list if the user has no report jobs
     */
    public List<ReportJob> getJobsForUser(UUID userId) {
        return reportJobRepository.findByRequestedById(userId);
    }

    /**
     * Retrieves all report jobs across all users, newest first.
     * Intended for admin-facing views (dashboard, archives) rather than
     * the per-user "my jobs" endpoint.
     *
     * Side effects: Queries the database for all report jobs across the system.
     * 
     * @return every {@link ReportJob} in the system, sorted by creation time descending
     */
    public List<ReportJob> getAllJobs() {
        return reportJobRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Retrieves all report items generated for a specific report job.
     * Each report item represents the generation result for an individual record,
     * including its processing status, generated file URL, and any failure information.
     *
     * Side effects: Queries the database for report items associated with the provided job ID.
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
     * Side effects: Persists a new job to the database, fires an SSE broadcast, and 
     *               triggers an asynchronous background thread for SQS/S3 queuing.
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
     * Configures and enqueues a report generation job for asynchronous background processing.
     *
     * Side effects: Modifies the job status in the database, writes a configuration JSON 
     *               file to an external S3 bucket, and dispatches a job payload message to 
     *               an external SQS queue.
     *
     * @param jobId the unique identifier of the report job
     * @param reportName the name of the report batch
     * @param configuration the JSON configuration string for the template
     * @param inputs the list of input data items for the report
     */
    private void processJobInBackground(UUID jobId, String reportName, String configuration, List<ReportJobRequest.InputItem> inputs) {
        try {
            markJobStatus(jobId, "PROCESSING", null);
            String configKey = "configs/" + jobId + ".json";
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(BUCKET_NAME)
                            .key(configKey)
                            .contentType("application/json")
                            .build(),
                    RequestBody.fromBytes(configuration.getBytes(StandardCharsets.UTF_8))
            );

            Map<String, Object> payload = new HashMap<>();
            payload.put("jobId", jobId.toString());
            payload.put("reportName", reportName);
            payload.put("configurationKey", configKey);
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

    /**
     * Processes the webhook payload received upon the completion of a background report generation job.
     *
     * Side effects: Parses the result payload to create and persist multiple ReportItem
     *               records to the database, updates the parent ReportJob status, and triggers 
     *               an SSE broadcast to connected clients.
     *
     * @param webhookPayload a Map containing the job results, status, and generated file URLs
     */
    public void handleJobCompletion(Map<String, Object> webhookPayload) {
        UUID jobId = UUID.fromString((String) webhookPayload.get("jobId"));
        String status = (String) webhookPayload.get("status");
        String fileUrl = (String) webhookPayload.get("fileUrl");

        ReportJob job = reportJobRepository.findById(jobId).orElseThrow();

        if ("DONE".equals(status)) {
            List<Map<String, Object>> results = (List<Map<String, Object>>) webhookPayload.get("results");
            if (results != null) {
                for (Map<String, Object> itemData : results) {
                    // studentId/studentName can be missing on a worker-side failure
                    // (e.g. the input never resolved to a real student), and the
                    // ReportItem constructor shouldn't be handed a raw null here -
                    // fall back to safe defaults so the row always saves cleanly.
                    String studentId = itemData.get("studentId") != null
                            ? (String) itemData.get("studentId") : "";
                    String studentName = itemData.get("studentName") != null
                            ? (String) itemData.get("studentName") : "Unknown";

                    ReportItem item = new ReportItem(job, studentId, studentName);
                    item.setStatus((String) itemData.get("status"));

                    if (itemData.containsKey("failureReason")) item.setFailureReason((String) itemData.get("failureReason"));
                    if (itemData.containsKey("grade")) item.setGrade((String) itemData.get("grade"));
                    if (itemData.containsKey("section")) item.setSection((String) itemData.get("section"));
                    if (itemData.containsKey("strand")) item.setStrand((String) itemData.get("strand"));
                    if (itemData.containsKey("course")) item.setCourse((String) itemData.get("course"));
                    if (itemData.containsKey("yearLevel")) item.setYearLevel((String) itemData.get("yearLevel"));
                    if (itemData.containsKey("fileUrl")) item.setFileUrl((String) itemData.get("fileUrl"));

                    reportItemRepository.save(item);
                }
            }
        }

        markJobStatus(jobId, status, fileUrl);
    }

    /**
     * Packages multiple completed report items into a single downloadable ZIP archive.
     *
     * Side effects: Queries the database for the selected items, makes outbound HTTP GET 
     *               requests to fetch the files from external S3 storage, and streams the 
     *               zipped byte output directly to the HttpServletResponse.
     *
     * @param selectedItemIds the list of UUIDs for the specific report items to include
     * @param response the HttpServletResponse to stream the ZIP archive into
     * @throws IOException if there is an error reading the external files or writing to the response output stream
     */
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
     * Side effects: Modifies the job record in the database and pushes an update 
     *               event to all active SSE clients.
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
     * Side effects: Updates active emitters and registers lifecycle callbacks.
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
     * Side effects: Transmits data over active HTTP connections and removes stale or broken 
     *               connections from the internal in-memory list.
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