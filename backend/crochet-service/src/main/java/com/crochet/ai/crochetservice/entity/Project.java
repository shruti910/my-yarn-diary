package com.crochet.ai.crochetservice.entity;

import com.crochet.ai.crochetservice.util.SecureTextAttributeConverter;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.SoftDelete;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "projects")
@SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "project_id", nullable = false, unique = true)
    private UUID projectId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_pk_id", nullable = false)
    private Category category;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @NotBlank(message = "Project title is required")
    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @JsonProperty("yarns")
    @Builder.Default
    private List<Yarn> yarnEntities = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @JsonProperty("hooks")
    @Builder.Default
    private List<Hook> hookEntities = new ArrayList<>();

    @Column(name = "status", nullable = false, length = 30)
    private ProjectStatus status; // PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD

    @Column(name = "row_count", nullable = false)
    private int rowCount;

    @Column(name = "encrypted_notes")
    @Convert(converter = SecureTextAttributeConverter.class)
    private String notes;

    @Column(name = "care_instructions", length = 500)
    private String careInstructions;

    @Column(name = "total_time")
    private String totalTime;

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;

    @JsonProperty("isFavorite")
    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private boolean isFavorite = false;

    @JsonProperty("isArchive")
    @Column(name = "is_archive", nullable = false)
    @Builder.Default
    private boolean isArchive = false;


    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnore
    @Builder.Default
    private List<Photo> photoEntities = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @JsonProperty("patterns")
    @Builder.Default
    private List<Pattern> patternEntities = new ArrayList<>();



    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ProjectStatus.IN_PROGRESS;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
