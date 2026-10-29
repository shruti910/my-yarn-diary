package com.crochet.ai.userservice.entity;

import com.crochet.ai.userservice.enums.MembershipStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @NotBlank(message = "Display name is required")
    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "profile_picture", columnDefinition = "TEXT")
    private String profilePicture;

    @Enumerated(EnumType.STRING)
    @Column(name = "membership_status", nullable = false, length = 30)
    @Builder.Default
    private MembershipStatus membershipStatus = MembershipStatus.FREE;

    @Column(name = "membership_active", nullable = false)
    @Builder.Default
    private boolean membershipActive = false;

    @Column(name = "crochet_terminology", nullable = false, length = 10)
    @Builder.Default
    private String crochetTerminology = "US";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.membershipStatus == null) {
            this.membershipStatus = MembershipStatus.FREE;
        }
        if (this.crochetTerminology == null) {
            this.crochetTerminology = "US";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
