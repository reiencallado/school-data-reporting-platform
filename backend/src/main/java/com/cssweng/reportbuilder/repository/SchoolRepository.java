package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.School;

import java.util.UUID;
import java.util.Optional;

/**
 * Provides database access operations for School entities.
 */
@Repository
public interface SchoolRepository extends JpaRepository<School, UUID> {
    // Basic CRUD operations are automatically build by Spring Boot
    /**
     * Retrieves a school by its unique code.
     *
     * @param code the school code
     * @return the matching school, if found
     */
    Optional<School> findByCode(String code);
}