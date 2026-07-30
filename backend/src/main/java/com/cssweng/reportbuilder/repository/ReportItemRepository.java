package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cssweng.reportbuilder.model.ReportItem;

import java.util.UUID;
import java.util.List;

/**
 * Provides database access operations for ReportItem entities.
 */
@Repository
public interface ReportItemRepository extends JpaRepository<ReportItem, UUID> {

    /**
     * Fetches all individual student report rows belonging to one batch job.
     *
     * @param jobId the unique identifier of the report job
     * @return a list of report items belonging to the specified job
     */
    List<ReportItem> findByJobId(UUID jobId);
}