package com.cssweng.reportbuilder.model;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ReportJobRequest {
    private UUID templateId;
    private String details;
    private List<Map<String, String>> inputs;

    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public List<Map<String, String>> getInputs() { return inputs; }
    public void setInputs(List<Map<String, String>> inputs) { this.inputs = inputs; }
}