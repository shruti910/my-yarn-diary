package com.crochet.ai.userservice.dto;

public record UserSignUpRequest(
    String email,
    String password,
    String displayName,
    String phoneNumber,
    String avatarUrl,
    String crochetTerminology
) {
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getDisplayName() { return displayName; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getCrochetTerminology() { return crochetTerminology; }
}
