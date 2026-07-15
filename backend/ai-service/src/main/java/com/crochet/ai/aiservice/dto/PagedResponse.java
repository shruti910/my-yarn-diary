package com.crochet.ai.aiservice.dto;

import org.springframework.data.domain.Page;
import java.util.List;

public record PagedResponse<T>(
    List<T> content,
    int totalPages,
    long totalElements,
    int number,
    int size
) {
    public static <S, T> PagedResponse<T> fromPage(Page<S> page, List<T> content) {
        return new PagedResponse<>(
            content,
            page.getTotalPages(),
            page.getTotalElements(),
            page.getNumber(),
            page.getSize()
        );
    }
    
    public static <T> PagedResponse<T> fromPage(Page<T> page) {
        return new PagedResponse<>(
            page.getContent(),
            page.getTotalPages(),
            page.getTotalElements(),
            page.getNumber(),
            page.getSize()
        );
    }
}
