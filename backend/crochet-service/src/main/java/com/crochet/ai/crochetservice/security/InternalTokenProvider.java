package com.crochet.ai.crochetservice.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;

@Component
public class InternalTokenProvider {

    private final SecretKey secretKey;

    public InternalTokenProvider(@Value("${internal.jwt.secret}") String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize InternalTokenProvider key material", e);
        }
    }

    public String createToken(String userId) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userId)
                .claim("email", "")
                .claim("name", "")
                .claim("picture", "")
                .issuedAt(new Date(now))
                .expiration(new Date(now + 60000)) // 60 seconds
                .signWith(secretKey)
                .compact();
    }
}
