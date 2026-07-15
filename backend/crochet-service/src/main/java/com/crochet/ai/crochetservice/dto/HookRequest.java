package com.crochet.ai.crochetservice.dto;

public record HookRequest(
    Long hookId,
    Double sizeMm,
    String sizeUs,
    String material,
    String brand
) {}
