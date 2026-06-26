package com.crochet.ai.crochetservice.dto;

public record HookRequest(
    Double sizeMm,
    String sizeUs,
    String material,
    String brand
) {}
