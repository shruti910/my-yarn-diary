package com.crochet.ai.aiservice.repository;

import com.crochet.ai.aiservice.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    Optional<ChatSession> findByChatId(UUID chatId);
    List<ChatSession> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
