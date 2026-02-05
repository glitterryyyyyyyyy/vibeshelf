/* package com.vibeshelf.vibeshelf_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;

import org.slf4j.LoggerFactory;

import com.vibeshelf.vibeshelf_backend.model.BookSuggestion;
import com.vibeshelf.vibeshelf_backend.repository.BookRepository;
import com.vibeshelf.vibeshelf_backend.model.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;



@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class RecommendationsController {

    private final BookRepository bookRepository;
    private static final org.slf4j.Logger logger = LoggerFactory.getLogger(RecommendationsController.class);

    public RecommendationsController(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    // Deprecated lyric-based endpoint: removed dependency on the old local recommender.
    @GetMapping("/api/recommendations")
    public ResponseEntity<List<BookSuggestion>> getRecommendations(
            @RequestParam(name = "lyric", required = false) String lyric,
            @RequestParam(name = "start", defaultValue = "0") int start,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {

        // Return empty list to force callers to migrate to the new book-based endpoint.
        return ResponseEntity.status(410).body(new ArrayList<>());
    }

    // New endpoint: proxy to the Python KNN recommender.
    @GetMapping("/api/recommendations/book")
    public ResponseEntity<List<BookSuggestion>> getBookRecommendations(
            @RequestParam(name = "title") String title,
            @RequestParam(name = "start", defaultValue = "0") int start,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {

        try {
            if (title == null || title.isBlank()) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            // Python recommender disabled — use DB-based fallback directly
            int limitVal = Math.max(1, limit);
            List<BookSuggestion> results = new ArrayList<>();
            Page<Book> page = bookRepository.searchBooks(title, PageRequest.of(0, limitVal));
            for (Book b : page.getContent()) {
                String cover = (b.getImageUrl() != null && !b.getImageUrl().isEmpty()) ? b.getImageUrl() : null;
                results.add(new BookSuggestion(b.getTitle(), b.getAuthor(), b.getDescription(), cover));
            }

            if (start < 0) start = 0;
            if (start >= results.size()) return ResponseEntity.ok(new ArrayList<>());

            int end = Math.min(start + Math.max(1, limit), results.size());
            return ResponseEntity.ok(results.subList(start, end));

        } catch (Exception e) {
            logger.error("Error while fetching/parsing recommendations from Python recommender", e);

            // On failure, fall back to a DB search
            try {
                int limitVal = Math.max(1, limit);
                List<BookSuggestion> results = new ArrayList<>();
                Page<Book> page = bookRepository.searchBooks(title, PageRequest.of(0, limitVal));

                for (Book b : page.getContent()) {
                    String cover = (b.getImageUrl() != null && !b.getImageUrl().isEmpty()) ? b.getImageUrl() : null;
                    results.add(new BookSuggestion(b.getTitle(), b.getAuthor(), b.getDescription(), cover));
                }

                if (start >= results.size()) return ResponseEntity.ok(new ArrayList<>());
                int end = Math.min(start + Math.max(1, limit), results.size());
                return ResponseEntity.ok(results.subList(start, end));

            } catch (Exception ex) {
                logger.error("Fallback DB search failed", ex);
                return ResponseEntity.status(500).body(new ArrayList<>());
            }
        }
    }

    // Public alias under /api/books so SecurityConfig permitAll("/api/books/**") allows access
    @GetMapping("/api/books/recommendations/book")
    public ResponseEntity<List<BookSuggestion>> getBookRecommendationsPublic(
            @RequestParam(name = "title") String title,
            @RequestParam(name = "start", defaultValue = "0") int start,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {

        return getBookRecommendations(title, start, limit);
    }

    // Health proxy for Python recommender
    @GetMapping("/api/books/recommendations/health")
    public ResponseEntity<Object> recommenderHealth() {
        // Recommender disabled — always return unavailable
        logger.info("Recommender health endpoint called but recommender is disabled");
        return ResponseEntity.status(503).body(Map.of("status", "disabled"));
    }

    // MySQL-only recommendations endpoint
    @GetMapping("/api/recommendations/mysql")
    public ResponseEntity<List<BookSuggestion>> getMysqlRecommendations(
            @RequestParam(name = "lyric", required = false) String lyric,
            @RequestParam(name = "start", defaultValue = "0") int start,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {

        try {
            int limitVal = Math.max(1, limit);
            List<BookSuggestion> results = new ArrayList<>();

            if (lyric != null && !lyric.isBlank()) {
                // Search in repository (title/author/description/genre)
                Page<Book> page = bookRepository.searchBooks(lyric, PageRequest.of(0, limitVal));
                for (Book b : page.getContent()) {
                    if (b.getImageUrl() != null && !b.getImageUrl().isEmpty()) {
                        results.add(new BookSuggestion(b.getTitle(), b.getAuthor(), b.getDescription(), b.getImageUrl()));
                    }
                }
            }

            // If no matches, fall back to popular books
            if (results.isEmpty()) {
                List<Book> popular = bookRepository.findPopularBooks(PageRequest.of(0, limitVal));
                for (Book b : popular) {
                    if (b.getImageUrl() != null && !b.getImageUrl().isEmpty()) {
                        results.add(new BookSuggestion(b.getTitle(), b.getAuthor(), b.getDescription(), b.getImageUrl()));
                    }
                }
            }

            // Apply pagination
            if (start < 0) start = 0;
            if (start >= results.size()) return ResponseEntity.ok(new ArrayList<>());

            int end = Math.min(start + limitVal, results.size());
            return ResponseEntity.ok(results.subList(start, end));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(new ArrayList<>());
        }
    }
}
*/