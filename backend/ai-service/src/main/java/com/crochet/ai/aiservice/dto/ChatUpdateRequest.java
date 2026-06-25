package com.crochet.ai.aiservice.dto;

public record ChatUpdateRequest(String title, Boolean pinned) {
    public String getTitle() { return title; }
    public Boolean getPinned() { return pinned; }
}
