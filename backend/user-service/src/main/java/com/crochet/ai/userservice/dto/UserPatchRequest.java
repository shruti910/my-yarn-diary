package com.crochet.ai.userservice.dto;

public record UserPatchRequest(
    String displayName,
    String email,
    String profilePicture,
    String crochetTerminology
) {
    public String getDisplayName() { return displayName; }
    public String getEmail() { return email; }
    public String getProfilePicture() { return profilePicture; }
    public String getCrochetTerminology() { return crochetTerminology; }
}
