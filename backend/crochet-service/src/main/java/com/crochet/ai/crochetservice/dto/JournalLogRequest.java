package com.crochet.ai.crochetservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JournalLogRequest(
    @NotBlank(message = "Journal text cannot be empty")
    @Size(max = 5000, message = "Text entry must not exceed 5000 characters")
    String textEntry,
    @Size(max = 10000000, message = "Image is too large")
    String imageBase64,
    @Min(value = 0, message = "Row count snapshot cannot be negative")
    @Max(value = 1000000, message = "Row count snapshot is too large")
    Integer rowCountSnapshot
) {
    public String getTextEntry() { return textEntry; }
    public String getImageBase64() { return imageBase64; }
    public Integer getRowCountSnapshot() { return rowCountSnapshot; }
}
