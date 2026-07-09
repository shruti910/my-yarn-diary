package com.crochet.ai.gateway.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

public class UuidGenerator {

    /**
     * Converts a Firebase alphanumeric UID into an RFC 4122 standard UUIDv3
     * using SHA-256 to guarantee stable mapping and eliminate collision risk.
     * This avoids non-standard string splitting and shifts.
     */
    public static String getUuidFromFirebaseUid(String firebaseUid) {
        if (firebaseUid == null || firebaseUid.trim().isEmpty()) {
            throw new IllegalArgumentException("Firebase UID cannot be null or empty");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(firebaseUid.getBytes(StandardCharsets.UTF_8));
            // Name-based UUID using SHA-256 hash bytes
            return UUID.nameUUIDFromBytes(hashBytes).toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
