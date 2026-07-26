package com.crochet.ai.aiservice.dto;

import jakarta.validation.constraints.Size;

public record MessageRequest(
    @Size(max = 10000, message = "Message text is too long")
    String text,
    @Size(max = 10000000, message = "Image data is too large")
    String imageData
) {
    public String getText() { return text; }
    public String getImageData() { return imageData; }
}
