package com.crochet.ai.aiservice.dto;

public record PatternDecoderRequest(String imageBase64, String imageMime) {
    public String getImageBase64() { return imageBase64; }
    public String getImageMime() { return imageMime; }
}
