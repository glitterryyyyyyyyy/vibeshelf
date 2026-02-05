package com.vibeshelf.vibeshelf_backend.controller;

import com.vibeshelf.vibeshelf_backend.model.Book;
import com.vibeshelf.vibeshelf_backend.repository.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/genres")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class GenreController {

    @Autowired
    private BookRepository bookRepository;

    /**
     * Return a simple list of genres for the frontend to render as filters.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getGenres() {
        Map<String, Object> resp = new HashMap<>();
        try {
            // The simplified schema may not contain a reliable genre column.
            // Return an empty list to the frontend rather than a 500.
            List<String> genres = Collections.emptyList();
            resp.put("genres", genres);
            resp.put("total", 0);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("genres", Collections.emptyList());
            resp.put("error", "Failed to fetch genres: " + e.getMessage());
            // Return 200 with empty list to avoid breaking the frontend.
            return ResponseEntity.ok(resp);
        }
    }

    /**
     * Return paginated books belonging to a genre.
     * Matches frontend conventions: GET /api/genres/{genre}?page=1&limit=24
     */
    @GetMapping("/{genre}")
    public ResponseEntity<Map<String, Object>> getBooksByGenre(
            @PathVariable String genre,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit) {

        Map<String, Object> resp = new HashMap<>();
        try {
            if (page < 1) page = 1;
            // Genre-based listing is not supported on the simplified schema.
            // Return an empty result set rather than throwing an error.
            resp.put("books", Collections.emptyList());
            resp.put("totalReturned", 0);
            resp.put("total", 0);
            resp.put("totalPages", 0);
            resp.put("hasMore", false);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("books", Collections.emptyList());
            resp.put("error", "Failed to fetch books by genre: " + e.getMessage());
            resp.put("hasMore", false);
            return ResponseEntity.ok(resp);
        }
    }
}
