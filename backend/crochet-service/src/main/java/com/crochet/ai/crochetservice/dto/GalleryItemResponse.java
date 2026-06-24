package com.crochet.ai.crochetservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GalleryItemResponse {
    private String id;
    private String src;
    private String type;
    private String projectName;
    private String projectId;
    private String date;
    private String description;
}
