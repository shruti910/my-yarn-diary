package com.crochet.ai.aiservice.dto;

import com.crochet.ai.aiservice.enums.AuditAction;
import com.crochet.ai.aiservice.enums.ResourceType;

import java.util.UUID;

public record AuditLogEventRequest(
        UUID userId,
        AuditAction action,
        ResourceType resourceType,
        String resourceId,
        String status,
        String details
) {
    public AuditLogEventRequest {
        if (userId == null) {
            throw new IllegalArgumentException("userId must not be null");
        }
        if (action == null) {
            throw new IllegalArgumentException("action must not be null");
        }
    }
}
