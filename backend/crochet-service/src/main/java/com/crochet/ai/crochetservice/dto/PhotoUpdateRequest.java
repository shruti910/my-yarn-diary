package com.crochet.ai.crochetservice.dto;

public record PhotoUpdateRequest(
    Long id,
    boolean isCover
) {}
