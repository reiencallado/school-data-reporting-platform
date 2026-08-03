package com.cssweng.reportbuilder.model;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Represents the request payload for creating a report generation job.
 * Contains the selected report template, job details, and the input
 * records used to generate reports.
 */
public class ReportJobRequest {
    private UUID templateId;
    private String details;
    private List<InputItem> inputs;

    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public List<InputItem> getInputs() { return inputs; }
    public void setInputs(List<InputItem> inputs) { this.inputs = inputs; }

    /**
     * One entry in the batch: the pdfme-shaped field values used to
     * render the PDF, plus optional student identity metadata used
     * for filenames, ZIP naming, and the results/summary table.
     * `student` is null for DATA-kind reports (no student batch).
     */
    public static class InputItem {
        private Map<String, String> pdfmeInput;
        private Map<String, String> student;

        public Map<String, String> getPdfmeInput() { return pdfmeInput; }
        public void setPdfmeInput(Map<String, String> pdfmeInput) { this.pdfmeInput = pdfmeInput; }

        public Map<String, String> getStudent() { return student; }
        public void setStudent(Map<String, String> student) { this.student = student; }
    }
}