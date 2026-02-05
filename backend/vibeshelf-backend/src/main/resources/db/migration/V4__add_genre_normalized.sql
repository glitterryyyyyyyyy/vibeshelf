-- Add normalized genre column for fast equality checks
ALTER TABLE books_canonical
  ADD COLUMN genre_normalized VARCHAR(100) DEFAULT NULL;

-- Add index on the normalized column for fast IN(...) queries
CREATE INDEX idx_book_genre_normalized ON books_canonical (genre_normalized);
