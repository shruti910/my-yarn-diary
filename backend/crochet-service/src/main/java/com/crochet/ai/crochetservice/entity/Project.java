package com.crochet.ai.crochetservice.entity;

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

    @Column(name = "notes", columnDefinition = "TEXT")
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

    @Transient
    public List<String> getProductPhotos() {
        if (photoEntities == null) return new ArrayList<>();
        return photoEntities.stream()
                .map(Photo::getPhotoBase64)
                .collect(Collectors.toList());
    }

    @Transient
    public void setProductPhotos(List<String> photos) {
        if (this.photoEntities == null) {
            this.photoEntities = new ArrayList<>();
        }
        if (photos == null || photos.isEmpty()) {
            this.photoEntities.clear();
            return;
        }

        // 1. Remove photo entities that are no longer in the new photos list
        this.photoEntities.removeIf(pe -> !photos.contains(pe.getPhotoBase64()));

        // 2. Add new photos that are not already in the entities list
        for (String base64 : photos) {
            if (base64 == null || base64.isBlank()) continue;

            boolean exists = this.photoEntities.stream()
                    .anyMatch(pe -> base64.equals(pe.getPhotoBase64()));

            if (!exists) {
                this.photoEntities.add(Photo.builder()
                        .project(this)
                        .photoBase64(base64)
                        .createdAt(LocalDateTime.now())
                        .build());
            }
        }
    }

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
