package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.JournalLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JournalLogRepository extends JpaRepository<JournalLog, Long> {
    Optional<JournalLog> findByLogId(UUID logId);
    List<JournalLog> findByProjectId(UUID projectId);
    List<JournalLog> findByUserId(UUID userId);
    void deleteByProjectId(UUID projectId);
    Page<JournalLog> findByUserIdAndProjectId(UUID userId, UUID projectId, Pageable pageable);
    Page<JournalLog> findByUserId(UUID userId, Pageable pageable);
}
