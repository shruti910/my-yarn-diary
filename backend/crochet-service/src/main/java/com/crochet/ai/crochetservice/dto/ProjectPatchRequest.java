package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import java.util.List;

public record ProjectPatchRequest(
    String categoryId,
    String title,
    ProjectStatus status,
    Integer rowCount,
    String notes,
    String startDate,
    String endDate,
    Boolean isArchive,
    String coverPhoto,
    String careInstructions,
    String totalTime,
    Boolean isFavorite
) {
    public String getCategoryId() { return categoryId; }
    public String getTitle() { return title; }
    public ProjectStatus getStatus() { return status; }
    public Integer getRowCount() { return rowCount; }
    public String getNotes() { return notes; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public Boolean getIsArchive() { return isArchive; }
    public String getCoverPhoto() { return coverPhoto; }
    public String getCareInstructions() { return careInstructions; }
    public String getTotalTime() { return totalTime; }
    public Boolean getIsFavorite() { return isFavorite; }
}
