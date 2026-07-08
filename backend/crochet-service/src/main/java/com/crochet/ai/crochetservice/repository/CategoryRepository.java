package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByCategoryId(UUID categoryId);
    List<Category> findByUserId(UUID userId);
}
