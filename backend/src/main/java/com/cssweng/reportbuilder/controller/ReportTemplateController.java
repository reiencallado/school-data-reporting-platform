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

/**
 * Handles HTTP requests related to report templates.
 * Provides endpoints for creating, retrieving, updating, deleting, and managing report template assets.
 */
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

    /**
     * Retrieves all active report templates.
     *
     * Side effects: Queries the database for all report template records.
     * 
     * @return a list of active report templates
    */
    @GetMapping
    public ResponseEntity<List<ReportTemplate>> getAllTemplates() {
        return ResponseEntity.ok(reportTemplateRepository.findByActiveTrue());
    }

    /**
     * Retrieves a report template by its ID and updates its last opened timestamp.
     *
     * Side effects: Modifies the template record by updating its lastOpenedAt timestamp 
     *               to current time and storing the change to the database before returning.
     * 
     * @param id the ID of the report template
     * @return the report template if found, or 404 if not found
    */
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

    /**
     * Retrieves all report templates associated with a school.
     *
     * Side effects: Queries the database for report templates linked to the provided school ID.
     * 
     * @param schoolId the ID of the school
     * @return a list of report templates belonging to the school
    */
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<ReportTemplate>> getTemplatesBySchool(@PathVariable UUID schoolId) {
        return ResponseEntity.ok(reportTemplateRepository.findBySchoolId(schoolId));
    }

    /**
     * Creates and saves a new report template.
     *
     * Side effects: Persists a newly created report template record to the database.
     * 
     * @param reportTemplate the report template to create
     * @return the saved report template
    */
    @PostMapping
    public ResponseEntity<ReportTemplate> createTemplate(@RequestBody ReportTemplate reportTemplate) {
        ReportTemplate saved = reportTemplateRepository.save(reportTemplate);
        return ResponseEntity.ok(saved);
    }

    /**
     * Updates an existing report template with the provided information.
     *
     * Side effects: Modifies the fields of an existing report template record in the database.
     * 
     * @param id the ID of the report template to update
     * @param reportTemplate the updated report template data
     * @return the updated report template, or 404 if not found
    */
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

    /**
     * Soft deletes a report template by marking it as inactive.
     * This keeps report_jobs (and any other historical references) intact,
     * and sidesteps the FK constraint entirely since the row is never removed.
     *
     * Side effects: Permanently removes a specific report template record from the database.
     * 
     * @param id the ID of the report template to delete
     * @return the updated report template, or 404 if not found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ReportTemplate> deleteTemplate(@PathVariable UUID id) {
        return reportTemplateRepository.findById(id)
                .map(existing -> {
                    existing.setActive(false);
                    ReportTemplate updated = reportTemplateRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Uploads a thumbnail image for a report template and updates its thumbnail URL.
     *
     * Side effects: Uploads the file to external storage via the StorageService and updates 
     *               the template's database record with the resulting URL.
     * 
     * @param id the ID of the report template
     * @param file the thumbnail image to upload
     * @return the uploaded thumbnail URL, or 404 if the template is not found
     */
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