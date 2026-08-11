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

    @PostMapping("/completion")
    public ResponseEntity<Void> handleJobCompletion(@RequestBody Map<String, Object> payload) {
        reportJobService.handleJobCompletion(payload);
        return ResponseEntity.ok().build();
    }
}