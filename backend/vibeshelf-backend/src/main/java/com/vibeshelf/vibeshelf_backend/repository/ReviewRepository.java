package com.vibeshelf.vibeshelf_backend.repository;

import com.vibeshelf.vibeshelf_backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByBookIdOrderByCreatedAtDesc(Long bookId);
}
