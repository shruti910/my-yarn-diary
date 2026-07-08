package com.crochet.ai.crochetservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record JournalLogResponse(
    UUID logId,
    UUID projectId,
    UUID userId,
    String textEntry,
    String imageBase64,
    Integer rowCountSnapshot,
    LocalDateTime createdAt
) {}
