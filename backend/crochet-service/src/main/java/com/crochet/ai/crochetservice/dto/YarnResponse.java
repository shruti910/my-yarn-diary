package com.crochet.ai.crochetservice.dto;

public record YarnResponse(
    Long yarnId,
    String brand,
    String lineName,
    String colorway,
    String dyeLot,
    String weight,
    String fiberContent,
    Double quantityUsed,
    String unit
) {}
