package com.vibeshelf.vibeshelf_backend.repository;

import com.vibeshelf.vibeshelf_backend.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {
    // Minimal repository: use JpaRepository's built-in methods (findAll(Pageable), findById, etc.)

    // Case-insensitive search by title OR author using LIKE %q%.
    @org.springframework.data.jpa.repository.Query("SELECT b FROM Book b WHERE (LOWER(b.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(b.author) LIKE LOWER(CONCAT('%', :q, '%'))) ")
    org.springframework.data.domain.Page<Book> findByTitleOrAuthorLike(@org.springframework.data.repository.query.Param("q") String q, org.springframework.data.domain.Pageable pageable);

    // Simpler case-insensitive partial match on the genre TEXT column. Uses
    // LOWER(genre) LIKE %:genre% so requests like ?genre=Fiction match
    // values such as "Fiction, Classics" and "Historical Fiction".
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM books_canonical b WHERE LOWER(b.genre) LIKE CONCAT('%', LOWER(:genre), '%')",
        countQuery = "SELECT COUNT(*) FROM books_canonical b WHERE LOWER(b.genre) LIKE CONCAT('%', LOWER(:genre), '%')",
        nativeQuery = true)
    org.springframework.data.domain.Page<Book> findAllByGenreToken(@org.springframework.data.repository.query.Param("genre") String genre, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM books_canonical b WHERE (LOWER(b.title) LIKE CONCAT('%', LOWER(:q), '%') OR LOWER(b.author) LIKE CONCAT('%', LOWER(:q), '%')) AND LOWER(b.genre) LIKE CONCAT('%', LOWER(:genre), '%')",
        countQuery = "SELECT COUNT(*) FROM books_canonical b WHERE (LOWER(b.title) LIKE CONCAT('%', LOWER(:q), '%') OR LOWER(b.author) LIKE CONCAT('%', LOWER(:q), '%')) AND LOWER(b.genre) LIKE CONCAT('%', LOWER(:genre), '%')",
        nativeQuery = true)
    org.springframework.data.domain.Page<Book> findByTitleOrAuthorLikeAndGenreToken(@org.springframework.data.repository.query.Param("q") String q,
                                               @org.springframework.data.repository.query.Param("genre") String genre,
                                               org.springframework.data.domain.Pageable pageable);

    // Regex-based OR matching for multiple genres. The controller will build a
    // regex like 'thriller|mystery' and we use LOWER(genre) REGEXP :regex to
    // match any of the tokens. countQuery provided so pagination remains correct.
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM books_canonical b WHERE LOWER(b.genre) REGEXP :regex",
        countQuery = "SELECT COUNT(*) FROM books_canonical b WHERE LOWER(b.genre) REGEXP :regex",
        nativeQuery = true)
    org.springframework.data.domain.Page<Book> findAllByGenreRegex(@org.springframework.data.repository.query.Param("regex") String regex, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM books_canonical b WHERE (LOWER(b.title) LIKE CONCAT('%', LOWER(:q), '%') OR LOWER(b.author) LIKE CONCAT('%', LOWER(:q), '%')) AND LOWER(b.genre) REGEXP :regex",
        countQuery = "SELECT COUNT(*) FROM books_canonical b WHERE (LOWER(b.title) LIKE CONCAT('%', LOWER(:q), '%') OR LOWER(b.author) LIKE CONCAT('%', LOWER(:q), '%')) AND LOWER(b.genre) REGEXP :regex",
        nativeQuery = true)
    org.springframework.data.domain.Page<Book> findByTitleOrAuthorLikeAndGenreRegex(@org.springframework.data.repository.query.Param("q") String q,
                                               @org.springframework.data.repository.query.Param("regex") String regex,
                                               org.springframework.data.domain.Pageable pageable);
}
 