package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.CollegeStudents;

import java.util.UUID;
import java.util.List;

/**
 * Provides database access operations for CollegeStudents entities.
 */
@Repository
public interface CollegeStudentsRepository extends JpaRepository<CollegeStudents, UUID> {
    /**
     * Retrieves all college students belonging to a specific school.
     *
     * @param schoolId the unique identifier of the school
     * @return a list of college students associated with the school
     */
    List<CollegeStudents> findBySchoolId(UUID schoolId);
}