package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.School;

import java.util.UUID;
import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, UUID> {
    // Basic CRUD operations are automatically build by Spring Boot
    // ADDED: Instantly fetch a school entity using its unique code (DLSU, PUP, etc.)
    Optional<School> findByCode(String code);
}