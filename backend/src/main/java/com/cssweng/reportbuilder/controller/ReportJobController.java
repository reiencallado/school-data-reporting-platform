package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.ReportItem;
import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.ReportJob;
import com.cssweng.reportbuilder.model.ReportJobRequest;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import com.cssweng.reportbuilder.service.ReportJobService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/report-jobs")
public class ReportJobController {

    private final ReportJobService reportJobService;
    private final AppUserRepository userRepository;

    public ReportJobController(ReportJobService reportJobService, AppUserRepository userRepository) {
        this.reportJobService = reportJobService;
        this.userRepository = userRepository;
    }

    // Fetch all batches for the user
    @GetMapping
    public ResponseEntity<List<ReportJob>> getMyJobs(Authentication authentication) {
        AppUser currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportJobService.getJobsForUser(currentUser.getId()));
    }

    // New batch job
    @PostMapping
    public ResponseEntity<ReportJob> createJob(@RequestBody ReportJobRequest request, Authentication authentication) {
        AppUser currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ReportJob job = reportJobService.createAndQueueJob(request, currentUser);
        return ResponseEntity.ok(job);
    }

    // For global notification
    @GetMapping("/stream")
    public SseEmitter streamUpdates() {
        return reportJobService.createNewEmitter();
    }

    // Fetch individual student report rows for one batch
    @GetMapping("/{jobId}/items")
    public ResponseEntity<List<ReportItem>> getJobItems(@PathVariable UUID jobId) {
        return ResponseEntity.ok(reportJobService.getItemsForJob(jobId));
    }
}