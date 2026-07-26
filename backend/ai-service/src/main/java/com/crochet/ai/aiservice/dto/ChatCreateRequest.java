package com.crochet.ai.aiservice.dto;

import com.crochet.ai.aiservice.util.ValidationConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChatCreateRequest(
    @NotBlank(message = "Session title is required")
    @Size(min = 1, max = 150, message = "Title must be between 1 and 150 characters")
    @Pattern(regexp = ValidationConstants.TEXT_REGEX, message = ValidationConstants.TEXT_REGEX_MESSAGE)
    String title,
    ChatCategory category
) {
    public String getTitle() { return title; }
    public ChatCategory getCategory() { return category != null ? category : ChatCategory.CROCHET_BUDDY; }
}
