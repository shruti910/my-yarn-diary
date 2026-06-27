package com.crochet.ai.userservice.dto;

public record UserSignUpRequest(
    String email,
    String password,
    String displayName,
    String profilePicture,
    String crochetTerminology
) {
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getDisplayName() { return displayName; }
    public String getProfilePicture() { return profilePicture; }
    public String getCrochetTerminology() { return crochetTerminology; }
}
