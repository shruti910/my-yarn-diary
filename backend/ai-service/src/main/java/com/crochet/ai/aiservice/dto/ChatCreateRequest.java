package com.crochet.ai.aiservice.dto;

public record ChatCreateRequest(String title) {
    public String getTitle() { return title; }
}
