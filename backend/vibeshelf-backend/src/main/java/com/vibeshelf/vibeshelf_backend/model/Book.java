package com.vibeshelf.vibeshelf_backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "books_canonical")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /* ================= CORE CANONICAL FIELDS ================= */

    @Column(columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String author;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String description;

    // DB column name is `image`
    @Column(name = "image", columnDefinition = "TEXT")
    private String image;
    @Column(columnDefinition = "TEXT")
    private String genre;
    // No other fields or accessors: this entity maps EXACTLY to `books_canonical`.
}
