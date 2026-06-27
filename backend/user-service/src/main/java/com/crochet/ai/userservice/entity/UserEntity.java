package com.crochet.ai.userservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@SoftDelete(columnName = "is_active", strategy = SoftDeleteType.ACTIVE)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {

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

    @NotBlank(message = "Password hash is required")
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "membership_status", nullable = false, length = 30)
    private MembershipStatus membershipStatus; // FREE, GOLDEN_HOOK, PLATINUM_YARN

    @Column(name = "membership_active", nullable = false)
    private boolean membershipActive;

    @Column(name = "crochet_terminology", nullable = false, length = 10)
    private String crochetTerminology;

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
