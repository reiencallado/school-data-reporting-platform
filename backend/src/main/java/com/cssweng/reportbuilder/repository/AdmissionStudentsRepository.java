package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.AdmissionStudents;

import java.util.UUID;

@Repository
public interface AdmissionStudentsRepository extends JpaRepository<AdmissionStudents, UUID> {
    
}