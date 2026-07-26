package com.crochet.ai.aiservice.dto;

import com.crochet.ai.aiservice.util.ValidationConstants;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChatUpdateRequest(
    @Size(min = 1, max = 150, message = "Title must be between 1 and 150 characters")
    @Pattern(regexp = ValidationConstants.TEXT_REGEX, message = ValidationConstants.TEXT_REGEX_MESSAGE)
    String title,
    Boolean pinned
) {
    public String getTitle() { return title; }
    public Boolean getPinned() { return pinned; }
}
