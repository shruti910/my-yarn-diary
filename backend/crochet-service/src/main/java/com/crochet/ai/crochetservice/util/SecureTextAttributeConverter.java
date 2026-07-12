package com.crochet.ai.crochetservice.util;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Converter
@Component
public class SecureTextAttributeConverter implements AttributeConverter<String, byte[]> {

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${db.encryption-secret:${DB_ENCRYPTION_SECRET}}")
    private String base64Secret;

    private SecretKeySpec secretKey;

    @PostConstruct
    public void init() {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(base64Secret.trim());
            if (decodedKey.length != 32) {
                throw new IllegalArgumentException(
                        "Encryption key must be 256 bits (32 bytes) long, got " + decodedKey.length + " bytes");
            }
            this.secretKey = new SecretKeySpec(decodedKey, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize AES/GCM secret key from DB_ENCRYPTION_SECRET", e);
        }
    }

    @Override
    public byte[] convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            byte[] iv = new byte[12];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec spec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            byte[] ciphertext = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
            return combined;
        } catch (Exception e) {
            throw new RuntimeException("Error encrypting attribute", e);
        }
    }

    @Override
    public String convertToEntityAttribute(byte[] dbData) {
        if (dbData == null || dbData.length == 0) {
            return null;
        }
        try {
            if (dbData.length < 12) {
                throw new IllegalArgumentException("Data is too short to contain a 12-byte IV");
            }
            byte[] iv = new byte[12];
            System.arraycopy(dbData, 0, iv, 0, 12);

            byte[] ciphertext = new byte[dbData.length - 12];
            System.arraycopy(dbData, 12, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec spec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            byte[] decrypted = cipher.doFinal(ciphertext);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error decrypting attribute", e);
        }
    }
}
