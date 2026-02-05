-- Database indexes for optimal performance with 90K+ books
-- Execute this script to add performance indexes

-- Essential indexes for books table
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);
CREATE INDEX IF NOT EXISTS idx_books_publication_year ON books(publication_year);

-- Composite indexes for efficient pagination and sorting
CREATE INDEX IF NOT EXISTS idx_books_id_created ON books(id, created_at);
CREATE INDEX IF NOT EXISTS idx_books_rating_count ON books(rating, ratings_count);
CREATE INDEX IF NOT EXISTS idx_books_popular_rating ON books(is_popular, rating, ratings_count);

-- Indexes for unique lookups
CREATE INDEX IF NOT EXISTS idx_books_google_id ON books(google_books_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn10 ON books(isbn_10);
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn_13);

-- Full-text search index for H2 (if supported)
-- Note: H2 has limited full-text search capabilities
-- For production, consider using PostgreSQL with full-text search or Elasticsearch

-- Performance statistics
-- CREATE STATISTICS IF NOT EXISTS books_title_author_stats ON title, author FROM books;
-- CREATE STATISTICS IF NOT EXISTS books_genre_rating_stats ON genre, rating FROM books;