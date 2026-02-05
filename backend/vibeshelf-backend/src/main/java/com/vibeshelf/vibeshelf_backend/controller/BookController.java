package com.vibeshelf.vibeshelf_backend.controller;

import com.vibeshelf.vibeshelf_backend.model.Book;
import com.vibeshelf.vibeshelf_backend.repository.BookRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;

import java.util.*;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175"
})
public class BookController {

    private final BookRepository bookRepository;

    public BookController(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    /* ================= LIST BOOKS (EXPLORE PAGE) ================= */

    @GetMapping
    public ResponseEntity<Map<String, Object>> getBooks(
            @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "24") int limit,
        @RequestParam(required = false) String genre
    ) {

        if (page < 1) page = 1;
        int pageIndex = page - 1;

        org.springframework.data.domain.Page<com.vibeshelf.vibeshelf_backend.model.Book> resultPage;

        if (genre == null || genre.isBlank()) {
            resultPage = bookRepository.findAll(PageRequest.of(pageIndex, limit));
        } else {
            // Support multi-select genres from the frontend without changing frontend code.
            // Parse the incoming genre string into tokens (split on common separators) and
            // build a regex for OR-matching. Example: "Thriller,Mystery" -> "thriller|mystery".
            String genreStr = genre.trim();
            List<String> tokens = new ArrayList<>();
            // Handle JSON-array-like strings (e.g. ["Thriller","Mystery"]) by stripping [] and quotes
            if ((genreStr.startsWith("[") && genreStr.endsWith("]")) || genreStr.contains("\"")) {
                    String cleaned = genreStr.replaceAll("^[\\[\\]\"]+|[\\[\\]\"]+$", "");
                // split on comma
                for (String s : cleaned.split(",")) {
                        String t = s.replaceAll("^\\\"|\\\"$", "").trim();
                    if (!t.isEmpty()) tokens.add(t.toLowerCase());
                }
            } else {
                for (String s : genreStr.split("\\s*[,/\\\\;|]\\s*")) {
                    String t = s.trim();
                    if (!t.isEmpty()) tokens.add(t.toLowerCase());
                }
            }

            if (tokens.isEmpty()) {
                resultPage = bookRepository.findAll(PageRequest.of(pageIndex, limit));
            } else if (tokens.size() == 1) {
                // single token: reuse existing simple LIKE-based repository method for clarity
                resultPage = bookRepository.findAllByGenreToken(tokens.get(0), PageRequest.of(pageIndex, limit));
            } else {
                // multiple tokens: build regex joined by | and delegate to regex-based repository method
                    String regex = String.join("|", tokens).replaceAll("\\s+", "");
                resultPage = bookRepository.findAllByGenreRegex(regex, PageRequest.of(pageIndex, limit));
            }
        }

        List<Map<String, Object>> books = new ArrayList<>();

        for (Book b : resultPage) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", b.getId());
            m.put("title", b.getTitle());
            m.put("author", b.getAuthor());
            m.put("imageUrl", b.getImage()); // keep image mapping; do not add rating (not in canonical)
            books.add(m);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("books", books);
        response.put("total", resultPage.getTotalElements());
        response.put("totalPages", resultPage.getTotalPages());
        response.put("hasMore", resultPage.hasNext());

        return ResponseEntity.ok(response);
    }

    /* ================= SEARCH (title OR author) ================= */

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchBooks(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "48") int limit
            ,@RequestParam(required = false) String genre
    ) {
        if (page < 1) page = 1;
        int pageIndex = page - 1;

        // If no query provided, behave like the list endpoint
        if (q == null || q.isBlank()) {
            return getBooks(page, limit, genre);
        }

        // Normalize query (trim) and search case-insensitively via repository
        String qtrim = q.trim();
        org.springframework.data.domain.Page<com.vibeshelf.vibeshelf_backend.model.Book> resultPage;
        if (genre == null || genre.isBlank()) {
            resultPage = bookRepository.findByTitleOrAuthorLike(qtrim, PageRequest.of(pageIndex, limit));
        } else {
            String genreStr = genre.trim();
            List<String> tokens = new ArrayList<>();
            if ((genreStr.startsWith("[") && genreStr.endsWith("]")) || genreStr.contains("\"")) {
                    String cleaned = genreStr.replaceAll("^[\\[\\]\"]+|[\\[\\]\"]+$", "");
                for (String s : cleaned.split(",")) {
                    String t = s.replaceAll("^\\\"|\\\"$", "").trim();
                    if (!t.isEmpty()) tokens.add(t.toLowerCase());
                }
            } else {
                for (String s : genreStr.split("\\s*[,/\\\\;|]\\s*")) {
                    String t = s.trim();
                    if (!t.isEmpty()) tokens.add(t.toLowerCase());
                }
            }

            if (tokens.isEmpty()) {
                resultPage = bookRepository.findByTitleOrAuthorLike(qtrim, PageRequest.of(pageIndex, limit));
            } else if (tokens.size() == 1) {
                resultPage = bookRepository.findByTitleOrAuthorLikeAndGenreToken(qtrim, tokens.get(0), PageRequest.of(pageIndex, limit));
            } else {
                String regex = String.join("|", tokens).replaceAll("\\s+", "");
                resultPage = bookRepository.findByTitleOrAuthorLikeAndGenreRegex(qtrim, regex, PageRequest.of(pageIndex, limit));
            }
        }

        List<Map<String, Object>> books = new ArrayList<>();

        for (Book b : resultPage) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", b.getId());
            m.put("title", b.getTitle());
            m.put("author", b.getAuthor());
            m.put("imageUrl", b.getImage());
            books.add(m);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("books", books);
        response.put("total", resultPage.getTotalElements());
        response.put("totalPages", resultPage.getTotalPages());
        response.put("hasMore", resultPage.hasNext());

        return ResponseEntity.ok(response);
    }

    /* ================= BOOK DETAILS PAGE ================= */

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBookById(@PathVariable Long id) {

        Optional<Book> opt = bookRepository.findById(id);

        if (opt.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Book not found"));
        }

        Book b = opt.get();

        Map<String, Object> book = new HashMap<>();
        book.put("id", b.getId());
        book.put("title", b.getTitle());
        book.put("author", b.getAuthor());
        book.put("description", b.getDescription());
    book.put("imageUrl", b.getImage());        // image exists in canonical
    book.put("genre", b.getGenre());

        return ResponseEntity.ok(Map.of("book", book));
    }

    /* ================= COUNT ================= */

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getTotalCount() {
        return ResponseEntity.ok(
                Map.of("totalBooks", bookRepository.count())
        );
    }
}
