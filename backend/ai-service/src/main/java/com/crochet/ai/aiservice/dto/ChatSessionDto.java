package com.crochet.ai.aiservice.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ChatSessionDto(
    String chatId,
    String userId,
    String title,
    ChatCategory category,
    List<ChatMessageDto> messages,
    LocalDateTime createdAt,
    Boolean pinned
) {
    public static class Builder {
        private String chatId;
        private String userId;
        private String title;
        private ChatCategory category;
        private List<ChatMessageDto> messages;
        private LocalDateTime createdAt;
        private Boolean pinned = false;

        public Builder chatId(String chatId) { this.chatId = chatId; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder category(ChatCategory category) { this.category = category; return this; }
        public Builder messages(List<ChatMessageDto> messages) { this.messages = messages; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder pinned(Boolean pinned) { this.pinned = pinned; return this; }

        public ChatSessionDto build() {
            return new ChatSessionDto(chatId, userId, title, category, messages, createdAt, pinned);
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}
