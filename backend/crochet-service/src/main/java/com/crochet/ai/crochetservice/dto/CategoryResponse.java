package com.crochet.ai.crochetservice.dto;

import java.util.UUID;

public record CategoryResponse(
    UUID categoryId,
    String name
) {}
