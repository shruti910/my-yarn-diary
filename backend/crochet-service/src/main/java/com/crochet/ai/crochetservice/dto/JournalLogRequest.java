package com.crochet.ai.crochetservice.dto;

public record JournalLogRequest(
    String textEntry,
    String imageBase64,
    Integer rowCountSnapshot
) {
    public String getTextEntry() { return textEntry; }
    public String getImageBase64() { return imageBase64; }
    public Integer getRowCountSnapshot() { return rowCountSnapshot; }
}
