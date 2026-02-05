package com.vibeshelf.vibeshelf_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * Read-only mapping to the books_staging_bbe table which contains
 * detailed metadata imported from the CSV. This entity is used only
 * for read operations (we won't write to this table from the app).
 */
@Entity
@Table(name = "books_staging_bbe")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StagingBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // original CSV id string (if present)
    @Column(name = "bookId")
    private String bookId;

    @Column(name = "title")
    private String title;

    @Column(name = "author")
    private String author;

    @Column(name = "description")
    private String description;

    @Column(name = "coverImg")
    private String coverImg;

    @Column(name = "bbeScore")
    private String bbeScore; // stored as varchar in staging

    @Column(name = "numRatings")
    private String numRatings; // stored as varchar in staging

    @Column(name = "firstPublishDate")
    private String firstPublishDate; // stored as varchar in staging

    @Column(name = "publishDate")
    private String publishDate;

    @Column(name = "genres")
    private String genres;

    // other staging columns exist but we only map the ones we need here
}
