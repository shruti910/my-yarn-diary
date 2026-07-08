package com.crochet.ai.crochetservice.dto;

public record GalleryItemResponse(
    String id,
    String src,
    String type,
    String projectName,
    String projectId,
    String date,
    String description
) {}
