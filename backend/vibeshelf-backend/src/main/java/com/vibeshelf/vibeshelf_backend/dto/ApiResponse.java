package com.vibeshelf.vibeshelf_backend.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private T data;
    private PaginationInfo pagination;
    private Meta meta;
    private String error;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Meta {
        private Boolean cached;
        private Long cacheAge; // seconds
        private String source; // "database", "cache", "error"
        private Long processingTime; // milliseconds
    }
}