-- Create reviews table for MySQL-backed user reviews
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT NOT NULL,
  user_id BIGINT,
  author_name VARCHAR(200),
  rating INT,
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reviews_book_id (book_id)
);
