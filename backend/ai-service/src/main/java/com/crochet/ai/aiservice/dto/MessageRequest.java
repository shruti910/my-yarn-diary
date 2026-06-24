package com.crochet.ai.aiservice.dto;

public record MessageRequest(String text, String imageData) {
    public String getText() { return text; }
    public String getImageData() { return imageData; }
}
