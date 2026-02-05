-- Flyway migration: add index on books(genre)
-- Safe / idempotent: will only add the index if it does not already exist.
-- Do NOT modify this file after creation; Flyway will pick it up when enabled.

-- This script works with MySQL. It checks INFORMATION_SCHEMA.STATISTICS for
-- an existing index named 'idx_books_genre' on the current database and
-- creates it only when missing.

SET @idx_exists = (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'books'
    AND INDEX_NAME = 'idx_books_genre'
);

SELECT CONCAT('idx_books_genre exists? ', @idx_exists) AS info;

-- If index is absent, create it using ALTER TABLE (works with InnoDB)
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `books` ADD INDEX `idx_books_genre` (`genre`);',
  'SELECT "index already exists";'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
