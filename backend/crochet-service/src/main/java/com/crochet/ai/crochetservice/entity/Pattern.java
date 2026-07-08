package com.crochet.ai.crochetservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SoftDelete;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "project_patterns")
@SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pattern {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "pattern_id", nullable = false, unique = true)
    private UUID patternId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_pk_id", nullable = false)
    @JsonIgnore
    private Project project;

    @Column(name = "pattern_type", nullable = false, length = 20)
    private String patternType; // 'pdf', 'image', 'text'

    @Column(name = "pattern_content", nullable = false, columnDefinition = "TEXT")
    private String patternContent;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.patternId == null) {
            this.patternId = UUID.randomUUID();
        }
    }
}
