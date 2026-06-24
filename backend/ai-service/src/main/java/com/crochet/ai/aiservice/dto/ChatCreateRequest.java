package com.crochet.ai.aiservice.dto;

public record ChatCreateRequest(String title, ChatCategory category) {
    public String getTitle() { return title; }
    public ChatCategory getCategory() { return category != null ? category : ChatCategory.CROCHET_BUDDY; }
}
