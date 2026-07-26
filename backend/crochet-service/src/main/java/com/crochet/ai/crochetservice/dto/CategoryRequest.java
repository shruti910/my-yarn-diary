package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.util.ValidationConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
    @NotBlank(message = "Category name is required")
    @Size(min = 1, max = 100, message = "Category name must be between 1 and 100 characters")
    @Pattern(regexp = ValidationConstants.TEXT_REGEX, message = ValidationConstants.TEXT_REGEX_MESSAGE)
    String name
) {
    public String getName() {
        return name;
    }
}
