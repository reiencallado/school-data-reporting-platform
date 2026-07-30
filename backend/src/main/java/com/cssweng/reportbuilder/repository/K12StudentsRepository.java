package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.K12Students;

import java.util.UUID;
import java.util.List;

/**
 * Provides database access operations for K12Students entities.
 */
@Repository
public interface K12StudentsRepository extends JpaRepository<K12Students, UUID> {
    /**
     * Retrieves all K-12 students belonging to a specific school.
     *
     * @param schoolId the unique identifier of the school
     * @return a list of K-12 students associated with the school
     */
    List<K12Students> findBySchoolId(UUID schoolId);
}