package com.crochet.ai.crochetservice.dto;

public record HookResponse(
    Long hookId,
    String size,
    String material,
    String brand
) {}
