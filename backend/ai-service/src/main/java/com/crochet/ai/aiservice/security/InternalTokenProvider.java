package com.crochet.ai.aiservice.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class InternalTokenProvider {

    private final SecretKey key;

    public InternalTokenProvider(@Value("${internal.jwt.secret}") String secret) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalArgumentException("internal.jwt.secret must be configured");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String createToken(String userId, String email, String firebaseUid) {
        long validityInMilliseconds = 120_000; // 2 minutes internal handoff token
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);

        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("firebaseUid", firebaseUid)
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();
    }
}
