package com.crochet.ai.aiservice.service;

import com.crochet.ai.aiservice.dto.AuditLogEventRequest;
import com.crochet.ai.aiservice.enums.AuditAction;
import com.crochet.ai.aiservice.enums.ResourceType;
import com.crochet.ai.aiservice.security.InternalTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Slf4j
@Service
public class AsyncAuditPublisher {

    private final RestTemplate restTemplate;
    private final InternalTokenProvider tokenProvider;
    private final String auditUrl;

    public AsyncAuditPublisher(
            @Qualifier("auditRestTemplate") RestTemplate restTemplate,
            InternalTokenProvider tokenProvider,
            @Value("${user-service.url:http://user-service:8081}") String userServiceUrl,
            @Value("${user-service.audit-endpoint:/api/v1/users/audit-events}") String auditEndpoint) {
        this.restTemplate = restTemplate;
        this.tokenProvider = tokenProvider;
        this.auditUrl = userServiceUrl + auditEndpoint;
    }

    @Async("virtualThreadAuditExecutor")
    public void publish(UUID userId, AuditAction action, ResourceType resourceType, String resourceId, String details) {
        if (userId == null || action == null) {
            log.warn("Skipping audit publish due to missing required attributes");
            return;
        }

        try {
            AuditLogEventRequest event = new AuditLogEventRequest(
                    userId,
                    action,
                    resourceType,
                    resourceId,
                    "SUCCESS",
                    details
            );

            String internalToken = tokenProvider.createToken(
                    userId.toString(),
                    "system@crochet.ai",
                    "internal-service-worker"
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId.toString());
            headers.set("X-Forwarded-Identity", internalToken);
            headers.set("Content-Type", "application/json");

            HttpEntity<AuditLogEventRequest> request = new HttpEntity<>(event, headers);
            restTemplate.exchange(auditUrl, HttpMethod.POST, request, Void.class);
            log.debug("Successfully published audit event {} for user {}", action, userId);
        } catch (Exception e) {
            log.warn("Non-blocking audit publish failed for action {}: {}", action, e.getMessage());
        }
    }
}
