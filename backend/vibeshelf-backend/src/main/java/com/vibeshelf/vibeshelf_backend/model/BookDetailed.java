package com.vibeshelf.vibeshelf_backend.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookDetailed {
    private Long id;
    private String title;
    private String author;
    private String description;
    private String imageUrl;
    private String genre;
    private Integer publicationYear;
    private Double rating;
    private Integer ratingsCount;
    private Long viewCount;
}
