package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import java.util.List;

public record ProjectRequest(
    String categoryId,
    String title,
    String yarnBrand,
    String yarnColorway,
    String yarnBatch,
    String hookSize,
    ProjectStatus status,
    int rowCount,
    String notes,
    String startDate,
    String endDate,
    List<String> productPhotos
) {
    public String getCategoryId() { return categoryId; }
    public String getTitle() { return title; }
    public String getYarnBrand() { return yarnBrand; }
    public String getYarnColorway() { return yarnColorway; }
    public String getYarnBatch() { return yarnBatch; }
    public String getHookSize() { return hookSize; }
    public ProjectStatus getStatus() { return status; }
    public int getRowCount() { return rowCount; }
    public String getNotes() { return notes; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public List<String> getProductPhotos() { return productPhotos; }
}
