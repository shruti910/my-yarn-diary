package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.Pattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatternRepository extends JpaRepository<Pattern, Long> {
    Optional<Pattern> findByPatternId(UUID patternId);
    void deleteByPatternId(UUID patternId);
    Page<Pattern> findByProjectUserId(UUID userId, Pageable pageable);
}
