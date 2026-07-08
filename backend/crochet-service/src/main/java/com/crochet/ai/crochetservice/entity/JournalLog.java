package com.crochet.ai.crochetservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.SoftDelete;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "journal_logs")
@SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JournalLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "log_id", nullable = false, unique = true)
    private UUID logId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_pk_id", nullable = false)
    private Project project;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @NotBlank(message = "Journal text cannot be empty")
    @Column(name = "text_entry", nullable = false, columnDefinition = "TEXT")
    private String textEntry;

    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64;

    @Column(name = "row_count_snapshot")
    private Integer rowCountSnapshot;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
