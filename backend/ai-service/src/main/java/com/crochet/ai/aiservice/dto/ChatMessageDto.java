package com.crochet.ai.aiservice.dto;

import java.time.LocalDateTime;

public record ChatMessageDto(
    String id,
    String role,
    String text,
    String imageData,
    LocalDateTime createdAt
) {
    public static class Builder {
        private String id;
        private String role;
        private String text;
        private String imageData;
        private LocalDateTime createdAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder role(String role) { this.role = role; return this; }
        public Builder text(String text) { this.text = text; return this; }
        public Builder imageData(String imageData) { this.imageData = imageData; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public ChatMessageDto build() {
            return new ChatMessageDto(id, role, text, imageData, createdAt);
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}
