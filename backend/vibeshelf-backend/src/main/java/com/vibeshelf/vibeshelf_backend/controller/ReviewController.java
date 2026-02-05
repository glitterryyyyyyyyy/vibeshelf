package com.vibeshelf.vibeshelf_backend.controller;

import com.vibeshelf.vibeshelf_backend.model.Review;
import com.vibeshelf.vibeshelf_backend.repository.ReviewRepository;
import com.vibeshelf.vibeshelf_backend.repository.UserRepository;
import com.vibeshelf.vibeshelf_backend.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.*;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "http://localhost:3000")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public ReviewController(ReviewRepository reviewRepository, UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<List<Map<String, Object>>> getReviewsForBook(@PathVariable Long bookId) {
        List<Review> reviews = reviewRepository.findByBookIdOrderByCreatedAtDesc(bookId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Review r : reviews) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("bookId", r.getBookId());
            m.put("userId", r.getUserId());
            m.put("authorName", r.getAuthorName());
            m.put("rating", r.getRating());
            m.put("reviewText", r.getReviewText());
            m.put("createdAt", r.getCreatedAt());
            out.add(m);
        }
        return ResponseEntity.ok(out);
    }

    public static class CreateReviewRequest {
        public Long bookId;
        public Integer rating;
        public String reviewText;
    }

    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody CreateReviewRequest req) {
        // Manual auth check: SecurityConfig permits this path for GETs; enforce auth here for writes.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required to submit reviews");
        }

        String email = auth.getName();
        Optional<User> u = userRepository.findByEmail(email);
        if (u.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        User user = u.get();

        if (req == null || req.bookId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("bookId is required");
        }

        Review r = Review.builder()
                .bookId(req.bookId)
                .userId(user.getId())
                .authorName(user.getUsername() != null ? user.getUsername() : user.getEmail())
                .rating(req.rating)
                .reviewText(req.reviewText)
                .build();

        Review saved = reviewRepository.save(r);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", saved.getId());
        resp.put("bookId", saved.getBookId());
        resp.put("userId", saved.getUserId());
        resp.put("authorName", saved.getAuthorName());
        resp.put("rating", saved.getRating());
        resp.put("reviewText", saved.getReviewText());
        resp.put("createdAt", saved.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }
}