package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.CollegeStudents;

import java.util.UUID;
import java.util.List;

@Repository
public interface CollegeStudentsRepository extends JpaRepository<CollegeStudents, UUID> {
    List<CollegeStudents> findBySchoolId(UUID schoolId);
}