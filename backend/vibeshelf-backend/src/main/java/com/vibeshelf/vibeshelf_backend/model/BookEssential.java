package com.vibeshelf.vibeshelf_backend.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookEssential {
    private Long id;
    private String title;
    private String author;
    private String imageUrl;
    private Double rating;
}