package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.AdmissionStudents;

import java.util.UUID;
import java.util.List;

/**
 * Provides database access operations for AdmissionStudents entities.
 */
@Repository
public interface AdmissionStudentsRepository extends JpaRepository<AdmissionStudents, UUID> {
    /**
     * Retrieves all admission students belonging to a specific school.
     *
     * @param schoolId the unique identifier of the school
     * @return a list of admission students associated with the school
     */
    List<AdmissionStudents> findBySchoolId(UUID schoolId);
}