package com.crochet.ai.aiservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_rate_limits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRateLimit {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "daily_token_budget", nullable = false)
    @Builder.Default
    private int dailyTokenBudget = 50000;

    @Column(name = "tokens_used_today", nullable = false)
    @Builder.Default
    private int tokensUsedToday = 0;

    @Column(name = "last_request_at", nullable = false)
    private Instant lastRequestAt;
}
