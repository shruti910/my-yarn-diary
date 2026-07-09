package com.crochet.ai.gateway.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;

public class TokenProvider {

    private final SecretKey secretKey;

    public TokenProvider(String secret) {
        // Enforce at least 256 bits (32 bytes) of key material by hashing the secret with SHA-256
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize TokenProvider key material", e);
        }
    }

    public String createToken(String userId, String email) {
        return createToken(userId, email, null, null);
    }

    public String createToken(String userId, String email, String name, String picture) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userId)
                .claim("email", email != null ? email : "")
                .claim("name", name != null ? name : "")
                .claim("picture", picture != null ? picture : "")
                .issuedAt(new Date(now))
                .expiration(new Date(now + 60000)) // 60 seconds expiration
                .signWith(secretKey)
                .compact();
    }
}
