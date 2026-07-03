package com.cssweng.reportbuilder.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "admission_students")
public class AdmissionStudents {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "first_name", nullable = false, length = 255)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 255)
    private String lastName;

    @Column(name = "last_school_attended", nullable = false, length = 255)
    private String lastSchoolAttended;

    @Column(name = "highest_grade_completed", nullable = false, length = 50)
    private String highestGradeCompleted;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal gpa;

    @Column(name = "grade_level_applied", length = 50)
    private String gradeLevelApplied;

    @Column(name = "course_applied", length = 255)
    private String courseApplied;

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public AdmissionStudents() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getLastSchoolAttended() { return lastSchoolAttended; }
    public void setLastSchoolAttended(String lastSchoolAttended) { this.lastSchoolAttended = lastSchoolAttended; }

    public String getHighestGradeCompleted() { return highestGradeCompleted; }
    public void setHighestGradeCompleted(String highestGradeCompleted) { this.highestGradeCompleted = highestGradeCompleted; }

    public BigDecimal getGpa() { return gpa; }
    public void setGpa(BigDecimal gpa) { this.gpa = gpa; }

    public String getGradeLevelApplied() { return gradeLevelApplied; }
    public void setGradeLevelApplied(String gradeLevelApplied) { this.gradeLevelApplied = gradeLevelApplied; }

    public String getCourseApplied() { return courseApplied; }
    public void setCourseApplied(String courseApplied) { this.courseApplied = courseApplied; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

/**
 * CREATE TABLE admission_students (
    id UUID PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    last_school_attended VARCHAR(255) NOT NULL,
    highest_grade_completed VARCHAR(50) NOT NULL,
    gpa DECIMAL(3, 2) NOT NULL,
    grade_level_applied VARCHAR(50),
    course_applied VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
 */