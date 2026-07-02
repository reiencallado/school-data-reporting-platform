package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.ReportTemplate;
import com.cssweng.reportbuilder.repository.ReportTemplateRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/report-templates")
@CrossOrigin(origins = "*")
public class ReportTemplateController {

    private final ReportTemplateRepository reportTemplateRepository;

    public ReportTemplateController(ReportTemplateRepository reportTemplateRepository) {
        this.reportTemplateRepository = reportTemplateRepository;
    }

    // GET http://localhost:8080/api/report-templates
    @GetMapping
    public ResponseEntity<List<ReportTemplate>> getAllTemplates() {
        return ResponseEntity.ok(reportTemplateRepository.findAll());
    }

    // GET http://localhost:8080/api/report-templates/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ReportTemplate> getTemplateById(@PathVariable UUID id) {
        return reportTemplateRepository.findById(id)
                .map(ResponseEntity::ok)
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
}