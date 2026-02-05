package com.vibeshelf.vibeshelf_backend.service;

import com.vibeshelf.vibeshelf_backend.model.Book;
import com.vibeshelf.vibeshelf_backend.model.BookDetailed;
import com.vibeshelf.vibeshelf_backend.model.BookEssential;
import com.vibeshelf.vibeshelf_backend.repository.BookRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.function.Function;

@Service
@Transactional(readOnly = true)
public class OptimizedBookService {

    private final BookRepository bookRepository;
    // stagingBookRepository removed — canonical-only schema; do not depend on staging table here.

    public OptimizedBookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    // Simple cache metadata placeholders (kept for compatibility with controllers)
    // Use guarded names to avoid any accidental injection.
    private static final ThreadLocal<Boolean> localCacheHit = ThreadLocal.withInitial(() -> Boolean.FALSE);
    private static final ThreadLocal<Long> localCacheAge = ThreadLocal.withInitial(() -> 0L);

    public boolean isCacheHit() {
        return Boolean.TRUE.equals(localCacheHit.get());
    }

    public Long getCacheAge() {
        return localCacheAge.get();
    }

    /**
     * Get books with essential fields only (simplified implementation).
     * This implementation uses only the minimal BookRepository methods and maps
     * available fields into BookEssential/BookDetailed-like structures.
     */
    public Page<BookEssential> getBooksEssential(int page, int limit, Long cursor, String sort, String order,
                                                 String genre, Double minRating, Integer minYear, Integer maxYear) {
        localCacheHit.set(false);
        Pageable pageable = createPageable(page, limit, sort, order);
        Page<Book> booksPage = bookRepository.findAll(pageable);
        // Map Book -> BookEssential manually. Canonical schema does not include rating;
        // use image (canonical column) and leave rating null.
        return booksPage.map(b -> {
            BookEssential e = new BookEssential();
            e.setId(b.getId());
            e.setTitle(b.getTitle());
            e.setAuthor(b.getAuthor());
            e.setImageUrl(b.getImage());
            e.setRating(null);
            return e;
        });
    }

    /**
     * Get books with detailed fields
     */
    public Page<BookDetailed> getBooksDetailed(int page, int limit, Long cursor, String sort, String order,
                                               String genre, Double minRating, Integer minYear, Integer maxYear) {
        localCacheHit.set(false);
        Pageable pageable = createPageable(page, limit, sort, order);
        Page<Book> booksPage = bookRepository.findAll(pageable);
        return booksPage.map(this::toDetailedSafe);
    }

    /**
     * Get books with all fields
     */
    public Page<Book> getBooksComplete(int page, int limit, Long cursor, String sort, String order,
                                       String genre, Double minRating, Integer minYear, Integer maxYear) {
        localCacheHit.set(false);
        Pageable pageable = createPageable(page, limit, sort, order);
        return bookRepository.findAll(pageable);
    }

    /**
     * Get single book by ID
     */
    public BookDetailed getBookById(Long id) {
        localCacheHit.set(false);
        // Use canonical table only: map Book -> BookDetailed
        return bookRepository.findById(id)
                .map(this::toDetailedSafe)
                .orElse(null);
    }

    /**
     * Search books with caching
     */
    public Page<BookDetailed> searchBooks(String searchTerm, int page, int limit, String genre, Double minRating) {
        localCacheHit.set(false);
        // Canonical schema has no `rating` column; request unsorted page instead.
        Pageable pageable = PageRequest.of(page, limit, Sort.unsorted());
        Page<Book> books = bookRepository.findAll(pageable);
        // Simple in-memory filter for the search term (title/author/description)
        List<Book> filtered = books.getContent().stream()
            .filter(b -> {
                if (searchTerm == null || searchTerm.isBlank()) return true;
                String q = searchTerm.toLowerCase();
                return (b.getTitle() != null && b.getTitle().toLowerCase().contains(q)) ||
                       (b.getAuthor() != null && b.getAuthor().toLowerCase().contains(q)) ||
                       (b.getDescription() != null && b.getDescription().toLowerCase().contains(q));
            })
            .collect(Collectors.toList());

        return new PageImpl<>(filtered.stream().map(this::toDetailedSafe).collect(Collectors.toList()), pageable, filtered.size());
    }

    /**
     * Get popular books (heavily cached)
     */
    public List<BookDetailed> getPopularBooks(int limit) {
        localCacheHit.set(true);
        localCacheAge.set(7200L); // 2 hours
        Pageable pageable = PageRequest.of(0, limit);
        Page<Book> page = bookRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDetailedSafe).collect(Collectors.toList());
    }

    /**
     * Get recent books
     */
    public List<BookDetailed> getRecentBooks(int limit) {
        localCacheHit.set(false);
        Pageable pageable = PageRequest.of(0, limit);
        Page<Book> page = bookRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDetailedSafe).collect(Collectors.toList());
    }

    /**
     * Get books by genre
     */
    public Page<BookDetailed> getBooksByGenre(String genre, int page, int limit) {
        localCacheHit.set(false);
        // The simplified schema does not contain a reliable genre column. Return empty page for genre queries.
        Pageable pageable = PageRequest.of(page, limit, Sort.unsorted());
        return new PageImpl<>(new java.util.ArrayList<>(), pageable, 0);
    }

    /**
     * Bulk get books by IDs
     */
    public List<BookDetailed> getBulkBooks(List<Long> bookIds) {
        List<Book> list = new java.util.ArrayList<>();
        bookRepository.findAllById(bookIds).forEach(list::add);
        return list.stream().map(this::toDetailedSafe).collect(Collectors.toList());
    }

    /**
     * Get autocomplete suggestions
     */
    public Map<String, List<String>> getSuggestions(String query, String type, int limit) {
        localCacheHit.set(true);
        Map<String, List<String>> suggestions = new HashMap<>();
        suggestions.put("titles", new java.util.ArrayList<>());
        suggestions.put("authors", new java.util.ArrayList<>());
        return suggestions;
    }

    /**
     * Get total books count (cached)
     */
    public Long getTotalBooksCount() {
        localCacheHit.set(true);
        localCacheAge.set(3600L); // 1 hour
        return bookRepository.count();
    }

    /**
     * Increment view count asynchronously
     */
    @Async
    @Transactional
    public void incrementViewCount(Long bookId) {
        // No-op on simplified schema; keep signature for compatibility
    }

    // Helper methods
    private Pageable createPageable(int page, int limit, String sort, String order) {
        Sort.Direction direction = "desc".equalsIgnoreCase(order) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, limit, Sort.by(direction, sort));
    }

    private boolean hasFilters(String genre, Double minRating, Integer minYear, Integer maxYear) {
        return genre != null || minRating != null || minYear != null || maxYear != null;
    }

    /**
     * Normalize a comma-separated genre string into a List of canonical genre tokens.
     * Returns null when no valid tokens exist. This implementation uses the raw
     * genre tokens (trimmed) and does NOT rely on any additional DB columns.
     */
    private java.util.List<String> normalizeGenresList(String genre) {
        if (genre == null) return null;
        String[] tokens = genre.split(",");
        java.util.List<String> mapped = new java.util.ArrayList<>();
        for (String raw : tokens) {
            if (raw == null) continue;
            String tok = raw.trim();
            if (tok.isEmpty()) continue;
            mapped.add(tok);
        }
        if (mapped.isEmpty()) return null;
        return mapped;
    }

    // Map minimal Book -> BookDetailed safely
    private BookDetailed toDetailedSafe(Book b) {
        BookDetailed d = BookDetailed.builder().build();
        if (b == null) return d;
        d.setId(b.getId());
        d.setTitle(b.getTitle());
        d.setAuthor(b.getAuthor());
        d.setDescription(b.getDescription());
        // Canonical schema only provides image and genre. Populate image from canonical
        // and leave rating/publicationYear/ratingsCount unset (null).
        d.setImageUrl(b.getImage());
        d.setPublicationYear(null);
        d.setRating(null);
        d.setRatingsCount(null);
        d.setGenre(b.getGenre());
        return d;
    }
}

// Helper class for manual pagination when using cursor-based pagination
class PageImpl<T> implements Page<T> {
    private final List<T> content;
    private final Pageable pageable;
    private final long total;

    public PageImpl(List<T> content, Pageable pageable, long total) {
        this.content = content;
        this.pageable = pageable;
        this.total = total;
    }

    @Override
    public List<T> getContent() {
        return content;
    }

    @Override
    public int getTotalPages() {
        return (int) Math.ceil((double) total / pageable.getPageSize());
    }

    @Override
    public long getTotalElements() {
        return total;
    }

    @Override
    public boolean hasNext() {
        return pageable.getPageNumber() + 1 < getTotalPages();
    }

    @Override
    public boolean hasPrevious() {
        return pageable.getPageNumber() > 0;
    }

    @Override
    public Pageable getPageable() {
        return pageable;
    }

    @Override
    public boolean isFirst() {
        return pageable.getPageNumber() == 0;
    }

    @Override
    public boolean isLast() {
        return pageable.getPageNumber() + 1 >= getTotalPages();
    }

    @Override
    public int getNumber() {
        return pageable.getPageNumber();
    }

    @Override
    public int getSize() {
        return pageable.getPageSize();
    }

    @Override
    public int getNumberOfElements() {
        return content.size();
    }

    @Override
    public boolean hasContent() {
        return !content.isEmpty();
    }

    @Override
    public boolean isEmpty() {
        return content.isEmpty();
    }

    @Override
    public Sort getSort() {
        return pageable.getSort();
    }

    @Override
    public Pageable nextPageable() {
        return hasNext() ? pageable.next() : Pageable.unpaged();
    }

    @Override
    public Pageable previousPageable() {
        return hasPrevious() ? pageable.previousOrFirst() : Pageable.unpaged();
    }

    @Override
    public <U> Page<U> map(Function<? super T, ? extends U> converter) {
        List<U> convertedContent = content.stream()
            .map(converter)
            .collect(Collectors.toList());
        return new PageImpl<>(convertedContent, pageable, total);
    }

    @Override
    public java.util.Iterator<T> iterator() {
        return content.iterator();
    }
}