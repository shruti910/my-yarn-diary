package com.crochet.ai.aiservice.repository;

import com.crochet.ai.aiservice.entity.ChatSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSessionEntity, Long> {
    Optional<ChatSessionEntity> findByChatId(UUID chatId);
    List<ChatSessionEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
