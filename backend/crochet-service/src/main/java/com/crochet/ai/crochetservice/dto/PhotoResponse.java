package com.crochet.ai.crochetservice.dto;

import java.time.LocalDateTime;

public record PhotoResponse(
    Long id,
    String photoBase64,
    boolean isCover,
    LocalDateTime createdAt
) {}
