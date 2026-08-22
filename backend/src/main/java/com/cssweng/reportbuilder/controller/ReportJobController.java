package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.ReportItem;
import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.ReportJob;
import com.cssweng.reportbuilder.model.ReportJobRequest;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import com.cssweng.reportbuilder.service.ReportJobService;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Handles HTTP requests related to report generation jobs.
 * Provides endpoints for creating jobs, retrieving a user's jobs,
 * receiving real-time job updates, and retrieving report items.
 */
@RestController
@RequestMapping("/api/report-jobs")
public class ReportJobController {

    private final ReportJobService reportJobService;
    private final AppUserRepository userRepository;

    public ReportJobController(ReportJobService reportJobService, AppUserRepository userRepository) {
        this.reportJobService = reportJobService;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves all report jobs belonging to the authenticated user.
     *
     * Side effects: Queries the database to resolve the current authenticated user's
     *               email, then queries for their associated report jobs.
     * 
     * @param authentication the authentication details of the current user
     * @return a list of report jobs belonging to the user
     */
    @GetMapping
    public ResponseEntity<List<ReportJob>> getMyJobs(Authentication authentication) {
        AppUser currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportJobService.getJobsForUser(currentUser.getId()));
    }

    /**
     * Retrieves all report jobs in the system, for admin views (dashboard,
     * archives) that need to see jobs from every user, not just their own.
     *
     * Side effects: Queries the database for all report job records across the system.
     * 
     * @return a list of all report jobs, newest first
     */
    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ReportJob>> getAllJobs() {
        return ResponseEntity.ok(reportJobService.getAllJobs());
    }

    /**
     * Creates a new report generation job for the authenticated user.
     *
     * Side effects: Queries the database for the user, then delegates to the ReportJobService 
     *               which persists a new job record, enqueues an SQS message, uploads a 
     *               configuration to S3, and broadcasts an SSE update.
     * 
     * @param request the report job request containing the job details
     * @param authentication the authentication details of the current user
     * @return the newly created report job
     */
    @PostMapping
    public ResponseEntity<ReportJob> createJob(@RequestBody ReportJobRequest request, Authentication authentication) {
        AppUser currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ReportJob job = reportJobService.createAndQueueJob(request, currentUser);
        return ResponseEntity.ok(job);
    }

    /**
     * Downloads a ZIP archive containing the generated files for the selected report items.
     *
     * Side effects: Modifies the HttpServletResponse to stream a ZIP file attachment. 
     *               Delegates to the service which fetches files from external S3 storage. 
     *               Alters the HTTP response status to 500 if an I/O error occurs.
     *
     * @param selectedItemIds the list of UUIDs for the report items to include in the download
     * @param response the HttpServletResponse used to stream the ZIP archive to the client
     */
    @PostMapping("/download-selected")
    public void downloadSelectedItems(@RequestBody List<UUID> selectedItemIds, HttpServletResponse response) {
        try {
            reportJobService.generateSelectedZip(selectedItemIds, response);
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Creates a server-sent events connection for receiving global job updates.
     *
     * @return an SSE emitter used to send real-time job notifications
     */
    @GetMapping("/stream")
    public SseEmitter streamUpdates() {
        return reportJobService.createNewEmitter();
    }

    /**
     * Fetch individual student report rows for one batch
     *
     * @param jobId the ID of the report job
     * @return a list of report items belonging to the job
     */
    @GetMapping("/{jobId}/items")
    public ResponseEntity<List<ReportItem>> getJobItems(@PathVariable UUID jobId) {
        return ResponseEntity.ok(reportJobService.getItemsForJob(jobId));
    }
}