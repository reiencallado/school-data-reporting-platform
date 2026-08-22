package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.service.ReportJobService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/webhook")
public class ReportWebhookController {

    private final ReportJobService reportJobService;

    public ReportWebhookController(ReportJobService reportJobService) {
        this.reportJobService = reportJobService;
    }

    /**
     * Endpoint for receiving webhook notifications from the background worker when 
     * a report generation job completes.
     * 
     * Side effects: Delegates to the ReportJobService, which parses the payload
     *               to persist new database records, updates the parent job status, 
     *               and triggers a real-time SSE broadcast to connected clients.
     *
     * @param payload a Map containing the job results
     * @return a 200 OK response with an empty body to acknowledge successful receipt of the webhook.
     */
    @PostMapping("/completion")
    public ResponseEntity<Void> handleJobCompletion(@RequestBody Map<String, Object> payload) {
        reportJobService.handleJobCompletion(payload);
        return ResponseEntity.ok().build();
    }
}