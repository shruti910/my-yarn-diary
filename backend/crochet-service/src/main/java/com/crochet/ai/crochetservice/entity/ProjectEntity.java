package com.crochet.ai.crochetservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
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
public class ProjectEntity {

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
    private CategoryEntity category;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @NotBlank(message = "Project title is required")
    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "yarn_brand", length = 100)
    private String yarnBrand;

    @Column(name = "yarn_colorway", length = 100)
    private String yarnColorway;

    @Column(name = "yarn_batch", length = 50)
    private String yarnBatch;

    @Column(name = "hook_size", length = 50)
    private String hookSize;

    @Column(name = "status", nullable = false, length = 30)
    private ProjectStatus status; // PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD

    @Column(name = "row_count", nullable = false)
    private int rowCount;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;

    @JsonProperty("isFavorite")
    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private boolean isFavorite = false;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnore
    @Builder.Default
    private List<ProjectPhotoEntity> photoEntities = new ArrayList<>();

    @Transient
    public List<String> getProductPhotos() {
        if (photoEntities == null) return new ArrayList<>();
        return photoEntities.stream()
                .map(ProjectPhotoEntity::getPhotoBase64)
                .collect(Collectors.toList());
    }

    @Transient
    public void setProductPhotos(List<String> photos) {
        if (this.photoEntities == null) {
            this.photoEntities = new ArrayList<>();
        }
        if (photos == null) {
            this.photoEntities.clear();
            return;
        }

        List<ProjectPhotoEntity> updatedList = new ArrayList<>();
        for (String base64 : photos) {
            if (base64 == null || base64.isBlank()) continue;

            // Find if it already exists
            Optional<ProjectPhotoEntity> existing = this.photoEntities.stream()
                    .filter(pe -> base64.equals(pe.getPhotoBase64()))
                    .findFirst();

            if (existing.isPresent()) {
                updatedList.add(existing.get());
            } else {
                updatedList.add(ProjectPhotoEntity.builder()
                        .project(this)
                        .photoBase64(base64)
                        .createdAt(LocalDateTime.now())
                        .build());
            }
        }

        // Clear and replace to trigger JPA orphanRemoval correctly
        this.photoEntities.clear();
        this.photoEntities.addAll(updatedList);
    }

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ProjectStatus.IN_PROGRESS;
        }
    }
}
