package com.crochet.ai.userservice.dto;

import com.crochet.ai.userservice.enums.MembershipStatus;
import java.time.LocalDateTime;

public record UserResponse(
    String userId,
    String displayName,
    String email,
    String profilePicture,
    MembershipStatus membershipStatus,
    boolean membershipActive,
    String crochetTerminology,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
