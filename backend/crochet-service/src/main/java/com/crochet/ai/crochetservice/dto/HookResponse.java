package com.crochet.ai.crochetservice.dto;

public record HookResponse(
    Long hookId,
    Double sizeMm,
    String sizeUs,
    String material,
    String brand
) {}
