package com.crochet.ai.userservice.dto;

import com.crochet.ai.userservice.util.ValidationConstants;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
    @Size(max = 100, message = "Display name cannot exceed 100 characters")
    @Pattern(regexp = ValidationConstants.TEXT_REGEX, message = ValidationConstants.TEXT_REGEX_MESSAGE)
    String displayName,

    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    String email,

    @Size(max = 20000000, message = "Profile picture payload too large")
    String profilePicture,

    @Pattern(regexp = "^(US|UK)?$", message = "Crochet terminology must be US or UK")
    String crochetTerminology
) {
    public String getDisplayName() { return displayName; }
    public String getEmail() { return email; }
    public String getProfilePicture() { return profilePicture; }
    public String getCrochetTerminology() { return crochetTerminology; }
}
