package com.vibeshelf.vibeshelf_backend.controller;

import com.vibeshelf.vibeshelf_backend.model.BookDetailed;
import com.vibeshelf.vibeshelf_backend.service.OptimizedBookService;
import com.vibeshelf.vibeshelf_backend.dto.ApiResponse;
import com.vibeshelf.vibeshelf_backend.dto.PaginationInfo;
import com.vibeshelf.vibeshelf_backend.dto.BulkBookRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v2/books")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
@Validated
public class OptimizedBookController {

    @Autowired
    private OptimizedBookService bookService;

    /**
     * Get books with enhanced pagination, caching, and field selection
     * Supports both offset and cursor-based pagination
     */
    @GetMapping
    public ResponseEntity<ApiResponse<?>> getBooks(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "essential") String fields,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "asc") String order,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Integer minYear,
            @RequestParam(required = false) Integer maxYear) {
        
        try {
            long startTime = System.currentTimeMillis();
            
            Page<?> booksPage;
            if ("essential".equals(fields)) {
                booksPage = bookService.getBooksEssential(page, limit, cursor, sort, order, genre, minRating, minYear, maxYear);
            } else if ("detailed".equals(fields)) {
                booksPage = bookService.getBooksDetailed(page, limit, cursor, sort, order, genre, minRating, minYear, maxYear);
            } else {
                booksPage = bookService.getBooksComplete(page, limit, cursor, sort, order, genre, minRating, minYear, maxYear);
            }
            
            long processingTime = System.currentTimeMillis() - startTime;
            
            PaginationInfo pagination = PaginationInfo.builder()
                .page(page)
                .limit(limit)
                .total(booksPage.getTotalElements())
                .totalPages(booksPage.getTotalPages())
                .hasNext(booksPage.hasNext())
                .hasPrev(booksPage.hasPrevious())
                .cursor(generateNextCursor(booksPage))
                .build();

            ApiResponse.Meta meta = ApiResponse.Meta.builder()
                .cached(bookService.isCacheHit())
                .cacheAge(bookService.getCacheAge())
                .source("database")
                .processingTime(processingTime)
                .build();

            ApiResponse<?> response = ApiResponse.builder()
                .data(booksPage.getContent())
                .pagination(pagination)
                .meta(meta)
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleGenericError("Failed to fetch books", e);
        }
    }

    /**
     * Get a single book by ID with view count increment
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookDetailed>> getBookById(@PathVariable @NotNull Long id) {
        try {
            BookDetailed book = bookService.getBookById(id);
            if (book == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Increment view count asynchronously
            bookService.incrementViewCount(id);
            
            ApiResponse<BookDetailed> response = ApiResponse.<BookDetailed>builder()
                .data(book)
                .meta(ApiResponse.Meta.builder()
                    .cached(bookService.isCacheHit())
                    .source("database")
                    .processingTime(0L)
                    .build())
                .build();
                
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleBookDetailedError("Failed to fetch book", e);
        }
    }

    /**
     * Search books with caching and performance optimization
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<BookDetailed>>> searchBooks(
        @RequestParam @NotNull String q,
        @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Double minRating) {
        
        try {
            long startTime = System.currentTimeMillis();
            
            Page<BookDetailed> searchResults = bookService.searchBooks(q, page, limit, genre, minRating);
            long processingTime = System.currentTimeMillis() - startTime;
            
            PaginationInfo pagination = PaginationInfo.builder()
                .page(page)
                .limit(limit)
                .total(searchResults.getTotalElements())
                .totalPages(searchResults.getTotalPages())
                .hasNext(searchResults.hasNext())
                .hasPrev(searchResults.hasPrevious())
                .build();

            ApiResponse<List<BookDetailed>> response = ApiResponse.<List<BookDetailed>>builder()
                .data(searchResults.getContent())
                .pagination(pagination)
                .meta(ApiResponse.Meta.builder()
                    .cached(bookService.isCacheHit())
                    .cacheAge(bookService.getCacheAge())
                    .source("database")
                    .processingTime(processingTime)
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleBookListError("Search failed", e);
        }
    }

    /**
     * Get popular books (heavily cached)
     */
    @GetMapping("/popular")
    public ResponseEntity<ApiResponse<List<BookDetailed>>> getPopularBooks(
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        
        try {
            List<BookDetailed> popularBooks = bookService.getPopularBooks(limit);
            
            ApiResponse<List<BookDetailed>> response = ApiResponse.<List<BookDetailed>>builder()
                .data(popularBooks)
                .meta(ApiResponse.Meta.builder()
                    .cached(true)
                    .cacheAge(bookService.getCacheAge())
                    .source("cache")
                    .processingTime(0L)
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleBookListError("Failed to fetch popular books", e);
        }
    }

    /**
     * Get recent books
     */
    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<BookDetailed>>> getRecentBooks(
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        
        try {
            List<BookDetailed> recentBooks = bookService.getRecentBooks(limit);
            
            ApiResponse<List<BookDetailed>> response = ApiResponse.<List<BookDetailed>>builder()
                .data(recentBooks)
                .meta(ApiResponse.Meta.builder()
                    .cached(bookService.isCacheHit())
                    .source("database")
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleBookListError("Failed to fetch recent books", e);
        }
    }

    /**
     * Get books by genre
     */
    @GetMapping("/genre/{genre}")
    public ResponseEntity<ApiResponse<List<BookDetailed>>> getBooksByGenre(
        @PathVariable String genre,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "24") @Min(1) @Max(100) int limit) {
        
        try {
            Page<BookDetailed> booksPage = bookService.getBooksByGenre(genre, page, limit);
            
            PaginationInfo pagination = PaginationInfo.builder()
                .page(page)
                .limit(limit)
                .total(booksPage.getTotalElements())
                .totalPages(booksPage.getTotalPages())
                .hasNext(booksPage.hasNext())
                .hasPrev(booksPage.hasPrevious())
                .build();

            ApiResponse<List<BookDetailed>> response = ApiResponse.<List<BookDetailed>>builder()
                .data(booksPage.getContent())
                .pagination(pagination)
                .meta(ApiResponse.Meta.builder()
                    .cached(bookService.isCacheHit())
                    .source("database")
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleBookListError("Failed to fetch books by genre", e);
        }
    }

    /**
     * Bulk get books by IDs
     */
    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<BookDetailed>>> getBulkBooks(
            @Valid @RequestBody BulkBookRequest request) {
        
        try {
            if (request.getBookIds().size() > 100) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.<List<BookDetailed>>builder()
                        .error("Maximum 100 books can be requested at once")
                        .build());
            }
            
            List<BookDetailed> books = bookService.getBulkBooks(request.getBookIds());
            
            ApiResponse<List<BookDetailed>> response = ApiResponse.<List<BookDetailed>>builder()
                .data(books)
                .meta(ApiResponse.Meta.builder()
                    .source("database")
                    .processingTime(0L)
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleBookListError("Bulk fetch failed", e);
        }
    }

    /**
     * Get autocomplete suggestions
     */
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> getSuggestions(
            @RequestParam String q,
            @RequestParam(defaultValue = "title") String type,
            @RequestParam(defaultValue = "10") @Min(1) @Max(20) int limit) {
        
        try {
            Map<String, List<String>> suggestions = bookService.getSuggestions(q, type, limit);
            
            ApiResponse<Map<String, List<String>>> response = ApiResponse.<Map<String, List<String>>>builder()
                .data(suggestions)
                .meta(ApiResponse.Meta.builder()
                    .cached(true)
                    .source("cache")
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleMapError("Failed to fetch suggestions", e);
        }
    }

    /**
     * Get total books count (cached)
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getBooksCount() {
        try {
            Long count = bookService.getTotalBooksCount();
            
            ApiResponse<Long> response = ApiResponse.<Long>builder()
                .data(count)
                .meta(ApiResponse.Meta.builder()
                    .cached(true)
                    .cacheAge(3600L) // 1 hour
                    .source("cache")
                    .build())
                .build();

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return handleLongError("Failed to fetch books count", e);
        }
    }

    // Helper methods
    private String generateNextCursor(Page<?> page) {
        if (!page.hasNext()) {
            return null;
        }
        // Simple cursor generation - in production, use more sophisticated approach
        return String.valueOf((page.getNumber() + 1) * page.getSize());
    }

    private ResponseEntity<ApiResponse<BookDetailed>> handleBookDetailedError(String message, Exception e) {
        // Log the error
        System.err.println(message + ": " + e.getMessage());
        e.printStackTrace();
        
        ApiResponse<BookDetailed> errorResponse = ApiResponse.<BookDetailed>builder()
            .error(message)
            .meta(ApiResponse.Meta.builder()
                .processingTime(0L)
                .source("error")
                .build())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }

    private ResponseEntity<ApiResponse<List<BookDetailed>>> handleBookListError(String message, Exception e) {
        // Log the error
        System.err.println(message + ": " + e.getMessage());
        e.printStackTrace();
        
        ApiResponse<List<BookDetailed>> errorResponse = ApiResponse.<List<BookDetailed>>builder()
            .error(message)
            .meta(ApiResponse.Meta.builder()
                .processingTime(0L)
                .source("error")
                .build())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }

    private ResponseEntity<ApiResponse<Map<String, List<String>>>> handleMapError(String message, Exception e) {
        // Log the error
        System.err.println(message + ": " + e.getMessage());
        e.printStackTrace();
        
        ApiResponse<Map<String, List<String>>> errorResponse = ApiResponse.<Map<String, List<String>>>builder()
            .error(message)
            .meta(ApiResponse.Meta.builder()
                .processingTime(0L)
                .source("error")
                .build())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }

    private ResponseEntity<ApiResponse<Long>> handleLongError(String message, Exception e) {
        // Log the error
        System.err.println(message + ": " + e.getMessage());
        e.printStackTrace();
        
        ApiResponse<Long> errorResponse = ApiResponse.<Long>builder()
            .error(message)
            .meta(ApiResponse.Meta.builder()
                .processingTime(0L)
                .source("error")
                .build())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }

    private ResponseEntity<ApiResponse<?>> handleGenericError(String message, Exception e) {
        // Log the error
        System.err.println(message + ": " + e.getMessage());
        e.printStackTrace();
        
        ApiResponse<?> errorResponse = ApiResponse.builder()
            .error(message)
            .meta(ApiResponse.Meta.builder()
                .processingTime(0L)
                .source("error")
                .build())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }
}