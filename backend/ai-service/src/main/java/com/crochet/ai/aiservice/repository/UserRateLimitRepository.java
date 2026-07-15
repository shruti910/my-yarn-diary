package com.crochet.ai.aiservice.repository;

import com.crochet.ai.aiservice.entity.UserRateLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface UserRateLimitRepository extends JpaRepository<UserRateLimit, UUID> {
}
