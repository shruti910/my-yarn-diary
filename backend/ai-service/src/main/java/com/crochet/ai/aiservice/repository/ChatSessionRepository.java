package com.crochet.ai.aiservice.repository;

import com.crochet.ai.aiservice.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.crochet.ai.aiservice.dto.ChatCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    Optional<ChatSession> findByChatId(UUID chatId);
    List<ChatSession> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT s FROM ChatSession s WHERE s.userId = :userId " +
           "AND (:category IS NULL OR s.category = :category)")
    Page<ChatSession> findSessionsForUser(
            @Param("userId") UUID userId,
            @Param("category") ChatCategory category,
            Pageable pageable);
}
