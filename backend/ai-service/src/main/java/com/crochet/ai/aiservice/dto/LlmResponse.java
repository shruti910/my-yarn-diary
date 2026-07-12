package com.crochet.ai.aiservice.dto;

import java.util.Map;

public record LlmResponse(
    String text,
    int promptTokens,
    int completionTokens,
    int reasoningTokens,
    String providerName,
    String modelName,
    Map<String, Object> metadata
) {}
