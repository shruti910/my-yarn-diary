package com.crochet.ai.crochetservice.service;

import com.crochet.ai.crochetservice.dto.AuditLogEventRequest;
import com.crochet.ai.crochetservice.enums.AuditAction;
import com.crochet.ai.crochetservice.enums.ResourceType;
import com.crochet.ai.crochetservice.security.InternalTokenProvider;
import lombok.extern.slf4j.Slf4j;
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
            RestTemplate restTemplate,
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
            AuditLogEventRequest request = new AuditLogEventRequest(
                    userId,
                    action,
                    resourceType,
                    resourceId,
                    "SUCCESS",
                    details
            );

            String internalToken = tokenProvider.createToken(userId.toString());
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId.toString());
            headers.set("X-Forwarded-Identity", internalToken);
            HttpEntity<AuditLogEventRequest> entity = new HttpEntity<>(request, headers);

            restTemplate.exchange(auditUrl, HttpMethod.POST, entity, Void.class);
            log.debug("Dispatched non-blocking audit event {} for user {}", action, userId);

        } catch (Exception e) {
            log.warn("Async audit log delivery failed for user {} (action: {}): {}", userId, action, e.getMessage());
        }
    }
}
