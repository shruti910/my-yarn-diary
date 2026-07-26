package com.crochet.ai.crochetservice.dto;

import jakarta.validation.constraints.Size;

public record ProjectPatternRequest(
    @Size(max = 100)
    String patternId,
    @Size(max = 20, message = "Pattern type must not exceed 20 characters")
    String patternType,
    @Size(max = 10000000, message = "Pattern content is too large")
    String patternContent,
    @Size(max = 255, message = "File name must not exceed 255 characters")
    String fileName
) {
    public String getPatternId() { return patternId; }
    public String getPatternType() { return patternType; }
    public String getPatternContent() { return patternContent; }
    public String getFileName() { return fileName; }
}
