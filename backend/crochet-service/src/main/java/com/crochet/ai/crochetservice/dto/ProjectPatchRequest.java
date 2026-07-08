package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import java.util.List;

public record ProjectPatchRequest(
    String categoryId,
    String title,
    List<YarnRequest> yarns,
    List<HookRequest> hooks,
    ProjectStatus status,
    Integer rowCount,
    String notes,
    String startDate,
    String endDate,
    List<String> productPhotos,
    Boolean isArchive,
    Integer thumbnailIndex,
    String careInstructions,
    String totalTime,
    Boolean isFavorite
) {
    public String getCategoryId() { return categoryId; }
    public String getTitle() { return title; }
    public List<YarnRequest> getYarns() { return yarns; }
    public List<HookRequest> getHooks() { return hooks; }
    public ProjectStatus getStatus() { return status; }
    public Integer getRowCount() { return rowCount; }
    public String getNotes() { return notes; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public List<String> getProductPhotos() { return productPhotos; }
    public Boolean getIsArchive() { return isArchive; }
    public Integer getThumbnailIndex() { return thumbnailIndex; }
    public String getCareInstructions() { return careInstructions; }
    public String getTotalTime() { return totalTime; }
    public Boolean getIsFavorite() { return isFavorite; }
}
