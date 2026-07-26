package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import com.crochet.ai.crochetservice.util.ValidationConstants;
import jakarta.validation.constraints.*;

public record ProjectRequest(
        @NotBlank(message = "Category ID is required") String categoryId,
        @NotBlank(message = "Title is required") @Size(min = 1, max = 150, message = "Title must be between 1 and 150 characters") @Pattern(regexp = ValidationConstants.TEXT_REGEX, message = ValidationConstants.TEXT_REGEX_MESSAGE) String title,
        ProjectStatus status,
        @Min(value = 0, message = "Row count cannot be negative") @Max(value = 1000000, message = "Row count is too large") int rowCount,
        @Size(max = 5000, message = "Notes must not exceed 5000 characters") String notes,
        @Size(max = 100) String startDate,
        @Size(max = 100) String endDate,
        Boolean isArchive,
        @Size(max = 500, message = "Care instructions must not exceed 500 characters") String careInstructions,
        @Size(max = 255, message = "Total time must not exceed 255 characters") String totalTime) {
    public String getCategoryId() {
        return categoryId;
    }

    public String getTitle() {
        return title;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public int getRowCount() {
        return rowCount;
    }

    public String getNotes() {
        return notes;
    }

    public String getStartDate() {
        return startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public Boolean getIsArchive() {
        return isArchive;
    }

    public String getCareInstructions() {
        return careInstructions;
    }

    public String getTotalTime() {
        return totalTime;
    }
}
