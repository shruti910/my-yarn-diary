package com.crochet.ai.userservice.dto;

import com.crochet.ai.userservice.enums.AuditAction;
import com.crochet.ai.userservice.enums.ResourceType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AuditLogEventRequest(
        @NotNull(message = "User ID is required") UUID userId,
        @NotNull(message = "Audit action is required") AuditAction action,
        ResourceType resourceType,
        String resourceId,
        String status,
        String details
) {}
