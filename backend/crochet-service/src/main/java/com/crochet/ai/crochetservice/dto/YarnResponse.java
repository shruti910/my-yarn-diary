package com.crochet.ai.crochetservice.dto;

public record YarnResponse(
    Long yarnId,
    String name,
    String colorName,
    String colorCode,
    String weight,
    String yardage,
    String quantity
) {}
