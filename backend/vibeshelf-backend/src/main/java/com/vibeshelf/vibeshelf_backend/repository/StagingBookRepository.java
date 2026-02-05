package com.vibeshelf.vibeshelf_backend.repository;

import com.vibeshelf.vibeshelf_backend.model.StagingBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StagingBookRepository extends JpaRepository<StagingBook, Long> {
    // read-only access to staging data; no custom methods needed for now
}
