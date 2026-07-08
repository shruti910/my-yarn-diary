package com.crochet.ai.crochetservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PatternResponse(
    UUID patternId,
    UUID projectId,
    String patternType,
    String patternContent,
    String fileName,
    LocalDateTime createdAt
) {}
