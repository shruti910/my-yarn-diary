package com.crochet.ai.crochetservice.dto;

import com.crochet.ai.crochetservice.entity.ProjectStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProjectResponse(
    UUID projectId,
    UUID userId,
    UUID categoryId,
    String title,
    ProjectStatus status,
    int rowCount,
    String notes,
    String careInstructions,
    String totalTime,
    String startDate,
    String endDate,
    boolean isFavorite,
    boolean isArchive,
    int thumbnailIndex,
    List<YarnResponse> yarns,
    List<HookResponse> hooks,
    List<PhotoResponse> photos,
    List<PatternResponse> patterns,
    List<String> productPhotos,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
