package com.crochet.ai.crochetservice.dto;

public record ProjectPatternRequest(
    String patternId,
    String patternType,
    String patternContent,
    String fileName
) {
    public String getPatternId() { return patternId; }
    public String getPatternType() { return patternType; }
    public String getPatternContent() { return patternContent; }
    public String getFileName() { return fileName; }
}
