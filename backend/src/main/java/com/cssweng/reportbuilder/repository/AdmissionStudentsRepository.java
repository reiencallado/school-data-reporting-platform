package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.AdmissionStudents;

import java.util.UUID;
import java.util.List;

@Repository
public interface AdmissionStudentsRepository extends JpaRepository<AdmissionStudents, UUID> {
    List<AdmissionStudents> findBySchoolId(UUID schoolId);
}