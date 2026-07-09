package com.crochet.ai.gateway.config;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.crochet.ai.gateway.util.TokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.util.Date;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.project-id}")
    private String firebaseProjectId;

    @Value("${internal.jwt.secret}")
    private String internalJwtSecret;

    @PostConstruct
    public void initializeFirebase() {
        if (FirebaseApp.getApps().isEmpty()) {
            try {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.getApplicationDefault())
                        .setProjectId(firebaseProjectId)
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("Firebase Admin SDK successfully initialized for project ID: {}", firebaseProjectId);
            } catch (Exception e) {
                log.warn("Failed to initialize Firebase Admin SDK using application default credentials: {}", e.getMessage());
                try {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.create(new AccessToken("dummy-token", new Date(Long.MAX_VALUE))))
                            .setProjectId(firebaseProjectId)
                            .build();
                    FirebaseApp.initializeApp(options);
                    log.info("Firebase Admin SDK initialized with dummy local credentials for project: {}", firebaseProjectId);
                } catch (Exception ex) {
                    log.error("Critical error: Could not initialize Firebase Admin SDK", ex);
                }
            }
        }
    }

    @Bean
    public TokenProvider tokenProvider() {
        return new TokenProvider(internalJwtSecret);
    }
}
