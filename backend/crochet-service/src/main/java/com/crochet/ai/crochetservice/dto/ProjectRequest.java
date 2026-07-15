package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import java.util.List;

public record ProjectRequest(
    String categoryId,
    String title,
    ProjectStatus status,
    int rowCount,
    String notes,
    String startDate,
    String endDate,
    Boolean isArchive,
    String careInstructions,
    String totalTime
) {
    public String getCategoryId() { return categoryId; }
    public String getTitle() { return title; }
    public ProjectStatus getStatus() { return status; }
    public int getRowCount() { return rowCount; }
    public String getNotes() { return notes; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public Boolean getIsArchive() { return isArchive; }
    public String getCareInstructions() { return careInstructions; }
    public String getTotalTime() { return totalTime; }
}
