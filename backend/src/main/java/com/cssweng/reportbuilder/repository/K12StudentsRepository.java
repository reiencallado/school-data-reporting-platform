package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cssweng.reportbuilder.model.K12Students;

import java.util.UUID;
import java.util.List;

@Repository
public interface K12StudentsRepository extends JpaRepository<K12Students, UUID> {
    List<K12Students> findBySchoolId(UUID schoolId);
}