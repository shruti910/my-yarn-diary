package com.crochet.ai.userservice.dto;

public record PasswordUpdateRequest(
    String currentPassword,
    String newPassword
) {
    public String getCurrentPassword() { return currentPassword; }
    public String getNewPassword() { return newPassword; }
}
