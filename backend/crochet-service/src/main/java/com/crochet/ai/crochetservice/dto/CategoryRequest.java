package com.crochet.ai.crochetservice.dto;

public record CategoryRequest(String name) {
    public String getName() {
        return name;
    }
}
