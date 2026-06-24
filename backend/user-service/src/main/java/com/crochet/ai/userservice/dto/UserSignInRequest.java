package com.crochet.ai.userservice.dto;

public record UserSignInRequest(
    String email,
    String password
) {
    public String getEmail() { return email; }
    public String getPassword() { return password; }
}
