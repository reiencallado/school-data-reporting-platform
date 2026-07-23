package com.cssweng.reportbuilder.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "report_items")
public class ReportItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private ReportJob job;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "student_name")
    private String studentName;

    @Column(nullable = false, length = 50)
    private String status = "PENDING"; // DONE | FAILED | PROCESSING | PENDING

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "grade")
    private String grade;

    @Column(name = "section")
    private String section;

    @Column(name = "strand")
    private String strand;

    public ReportItem() {}

    public ReportItem(ReportJob job, String studentId, String studentName) {
        this.job = job;
        this.studentId = studentId;
        this.studentName = studentName;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public ReportJob getJob() { return job; }
    public void setJob(ReportJob job) { this.job = job; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getStrand() { return strand; }
    public void setStrand(String strand) { this.strand = strand; }  
}