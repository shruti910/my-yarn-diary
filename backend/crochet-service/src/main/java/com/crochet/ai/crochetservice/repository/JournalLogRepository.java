package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.JournalLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JournalLogRepository extends JpaRepository<JournalLogEntity, Long> {
    Optional<JournalLogEntity> findByLogId(UUID logId);
    List<JournalLogEntity> findByProjectId(UUID projectId);
    List<JournalLogEntity> findByUserId(UUID userId);
    void deleteByProjectId(UUID projectId);
}
