package com.crochet.ai.userservice.dto;

import com.crochet.ai.userservice.util.ValidationConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSignUpRequest(
    @NotBlank(message = "Email is required")
    @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Invalid email format")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    String email,
    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters long")
    String password,
    @Size(max = 100, message = "Display name must not exceed 100 characters")
    @Pattern(regexp = ValidationConstants.TEXT_REGEX, message = ValidationConstants.TEXT_REGEX_MESSAGE)
    String displayName,
    @Size(max = 10000000, message = "Profile picture data is too large")
    String profilePicture,
    @Size(max = 10, message = "Crochet terminology must not exceed 10 characters")
    String crochetTerminology
) {
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getDisplayName() { return displayName; }
    public String getProfilePicture() { return profilePicture; }
    public String getCrochetTerminology() { return crochetTerminology; }
}
