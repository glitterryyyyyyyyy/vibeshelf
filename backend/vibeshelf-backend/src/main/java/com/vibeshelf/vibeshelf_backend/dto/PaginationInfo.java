package com.vibeshelf.vibeshelf_backend.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationInfo {
    private Integer page;
    private Integer limit;
    private Long total;
    private Integer totalPages;
    private Boolean hasNext;
    private Boolean hasPrev;
    private String cursor; // for cursor-based pagination
}