package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import java.util.List;

public record ProjectRequest(
    String categoryId,
    String title,
    List<YarnRequest> yarns,
    List<HookRequest> hooks,
    ProjectStatus status,
    int rowCount,
    String notes,
    String startDate,
    String endDate,
    List<String> productPhotos,
    Boolean isArchive,
    Integer thumbnailIndex,
    String careInstructions,
    String totalTime
) {
    public String getCategoryId() { return categoryId; }
    public String getTitle() { return title; }
    public List<YarnRequest> getYarns() { return yarns; }
    public List<HookRequest> getHooks() { return hooks; }
    public ProjectStatus getStatus() { return status; }
    public int getRowCount() { return rowCount; }
    public String getNotes() { return notes; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public List<String> getProductPhotos() { return productPhotos; }
    public Boolean getIsArchive() { return isArchive; }
    public Integer getThumbnailIndex() { return thumbnailIndex; }
    public String getCareInstructions() { return careInstructions; }
    public String getTotalTime() { return totalTime; }
}
