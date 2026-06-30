package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cssweng.reportbuilder.model.ReportJob;

import java.util.UUID;
import java.util.List;

@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, UUID> {
    
    List<ReportJob> findByStatus(String status);

    // ADDED: Allows a user to view their own personal report generation history queue
    List<ReportJob> findByRequestedById(UUID userId);
}