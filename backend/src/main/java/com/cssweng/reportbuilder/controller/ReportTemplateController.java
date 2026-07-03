package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.ReportTemplate;
import com.cssweng.reportbuilder.repository.ReportTemplateRepository;
import com.cssweng.reportbuilder.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/report-templates")
@CrossOrigin(origins = "*")
public class ReportTemplateController {

    private final ReportTemplateRepository reportTemplateRepository;
    private final StorageService storageService;

    public ReportTemplateController(ReportTemplateRepository reportTemplateRepository, StorageService storageService) {
        this.reportTemplateRepository = reportTemplateRepository;
        this.storageService = storageService;
    }

    // GET http://localhost:8080/api/report-templates
    @GetMapping
    public ResponseEntity<List<ReportTemplate>> getAllTemplates() {
        return ResponseEntity.ok(reportTemplateRepository.findAll());
    }

    // GET http://localhost:8080/api/report-templates/{id}
    // Also stamps last_opened_at, since this is what fires when a user
    // actually opens a template (preview or edit).
    @GetMapping("/{id}")
    public ResponseEntity<ReportTemplate> getTemplateById(@PathVariable UUID id) {
        return reportTemplateRepository.findById(id)
                .map(existing -> {
                    existing.setLastOpenedAt(Instant.now());
                    ReportTemplate updated = reportTemplateRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // GET http://localhost:8080/api/report-templates/school/{schoolId}
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<ReportTemplate>> getTemplatesBySchool(@PathVariable UUID schoolId) {
        return ResponseEntity.ok(reportTemplateRepository.findBySchoolId(schoolId));
    }

    // POST http://localhost:8080/api/report-templates
    @PostMapping
    public ResponseEntity<ReportTemplate> createTemplate(@RequestBody ReportTemplate reportTemplate) {
        ReportTemplate saved = reportTemplateRepository.save(reportTemplate);
        return ResponseEntity.ok(saved);
    }

    // PUT http://localhost:8080/api/report-templates/{id}
    @PutMapping("/{id}")
    public ResponseEntity<ReportTemplate> updateTemplate(@PathVariable UUID id, @RequestBody ReportTemplate reportTemplate) {
        return reportTemplateRepository.findById(id)
                .map(existing -> {
                    existing.setName(reportTemplate.getName());
                    existing.setConfiguration(reportTemplate.getConfiguration());
                    if (reportTemplate.getSchool() != null) {
                        existing.setSchool(reportTemplate.getSchool());
                    }
                    ReportTemplate updated = reportTemplateRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DEL http://localhost:8080/api/report-templates/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ReportTemplate> deleteTemplate(@PathVariable UUID id) {
        return reportTemplateRepository.findById(id)
                .map(existing -> {
                    reportTemplateRepository.delete(existing);
                    return ResponseEntity.ok(existing);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // POST http://localhost:8080/api/report-templates/{id}/thumbnail
    // Accepts a multipart image (e.g. PNG from a client-side canvas capture),
    // uploads it via StorageService, and stores the resulting URL on the template.
    @PostMapping("/{id}/thumbnail")
    public ResponseEntity<?> uploadThumbnail(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return reportTemplateRepository.findById(id)
                .map(existing -> {
                    try {
                        String url = storageService.uploadFileAndGetUrl(file, "thumbnails/");
                        existing.setThumbnailUrl(url);
                        reportTemplateRepository.save(existing);
                        return ResponseEntity.ok(Map.of("thumbnailUrl", url));
                    } catch (IOException e) {
                        return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload thumbnail"));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}