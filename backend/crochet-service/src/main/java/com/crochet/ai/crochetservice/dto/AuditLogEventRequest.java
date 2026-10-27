package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.enums.AuditAction;
import com.crochet.ai.crochetservice.enums.ResourceType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AuditLogEventRequest(
        @NotNull UUID userId,
        @NotNull AuditAction action,
        ResourceType resourceType,
        String resourceId,
        String status,
        String details
) {}
