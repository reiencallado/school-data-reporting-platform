package com.cssweng.reportbuilder.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "report_templates")
public class ReportTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    // Stores the massive JSON layout/configuration string from the WYSIWYG editor
    @Column(nullable = false, columnDefinition = "TEXT")
    private String configuration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "last_opened_at")
    private Instant lastOpenedAt;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    // Which student roster this template is meant for — K12, COLLEGE, or
    // ADMISSIONS (mirrors StudentType on the frontend). Nullable since
    // templates created before this field existed have no value here;
    // they simply won't match any type filter in Generate Report until
    // someone edits and sets one.
    @Column(name = "student_type", length = 20)
    private String studentType;

    public ReportTemplate() {}

    public ReportTemplate(String name, String configuration, School school) {
        this.name = name;
        this.configuration = configuration;
        this.school = school;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getConfiguration() { return configuration; }
    public void setConfiguration(String configuration) { this.configuration = configuration; }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }

    public Instant getLastOpenedAt() { return lastOpenedAt; }
    public void setLastOpenedAt(Instant lastOpenedAt) { this.lastOpenedAt = lastOpenedAt; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getStudentType() { return studentType; }
    public void setStudentType(String studentType) { this.studentType = studentType; }
}