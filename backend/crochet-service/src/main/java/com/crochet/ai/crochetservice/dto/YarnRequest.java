package com.crochet.ai.crochetservice.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

public record YarnRequest(
    Long yarnId,
    @Size(max = 255, message = "Brand must not exceed 255 characters")
    String brand,
    @Size(max = 255, message = "Line name must not exceed 255 characters")
    String lineName,
    @Size(max = 30, message = "Colorway must not exceed 30 characters")
    String colorway,
    @Size(max = 255, message = "Dye lot must not exceed 255 characters")
    String dyeLot,
    @Size(max = 30, message = "Weight must not exceed 30 characters")
    String weight,
    @Size(max = 500, message = "Fiber content must not exceed 500 characters")
    String fiberContent,
    @DecimalMin(value = "0.0", message = "Quantity used cannot be negative")
    @DecimalMax(value = "100000.0", message = "Quantity used is too large")
    Double quantityUsed,
    @Size(max = 30, message = "Unit must not exceed 30 characters")
    String unit
) {}
