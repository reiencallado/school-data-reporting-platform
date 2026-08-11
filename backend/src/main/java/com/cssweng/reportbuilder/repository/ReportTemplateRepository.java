package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.ReportTemplate;

import java.util.UUID;
import java.util.List;

/**
 * Provides database access operations for ReportTemplate entities.
 */
@Repository
public interface ReportTemplateRepository extends JpaRepository<ReportTemplate, UUID> {
    /**
     * Instantly retrieve all WYSIWYG layouts belonging to a specific school
     *
     * @param schoolId the unique identifier of the school
     * @return a list of report templates associated with the school
     */
    List<ReportTemplate> findBySchoolId(UUID schoolId);

    /**
     * Retrieves all active report templates.
     *
     * @return a list of active report templates
     */
    List<ReportTemplate> findByActiveTrue();
}