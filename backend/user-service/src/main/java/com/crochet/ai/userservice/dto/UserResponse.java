package com.crochet.ai.userservice.dto;

import com.crochet.ai.userservice.entity.MembershipStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private String userId;
    private String displayName;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private MembershipStatus membershipStatus;
    private boolean membershipActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
