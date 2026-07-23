package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cssweng.reportbuilder.model.ReportItem;

import java.util.UUID;
import java.util.List;

@Repository
public interface ReportItemRepository extends JpaRepository<ReportItem, UUID> {

    // Fetch all individual student report rows belonging to one batch job
    List<ReportItem> findByJobId(UUID jobId);
}