package com.crochet.ai.crochetservice.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

public record HookRequest(
    Long hookId,
    @DecimalMin(value = "0.1", message = "Hook size must be at least 0.1 mm")
    @DecimalMax(value = "50.0", message = "Hook size must not exceed 50.0 mm")
    Double sizeMm,
    @Size(max = 30, message = "US size must not exceed 30 characters")
    String sizeUs,
    @Size(max = 255, message = "Material must not exceed 255 characters")
    String material,
    @Size(max = 255, message = "Brand must not exceed 255 characters")
    String brand
) {}
