package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cssweng.reportbuilder.model.ReportJob;

import java.util.UUID;
import java.util.List;

/**
 * Provides CRUD operations for ReportJob entities.
 */
@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, UUID> {
    /**
     * Retrieves all report jobs with the specified status.
     *
     * @param status the report job status
     * @return a list of matching report jobs
     */
    List<ReportJob> findByStatus(String status);

    /**
     * Allows a user to view their own personal report generation history queue.
     *
     * @param userId the unique identifier of the user
     * @return a list of report jobs requested by the user
     */
    List<ReportJob> findByRequestedById(UUID userId);
}