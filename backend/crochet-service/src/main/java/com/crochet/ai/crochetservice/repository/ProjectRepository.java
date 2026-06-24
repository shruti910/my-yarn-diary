package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {
    Optional<ProjectEntity> findByProjectId(UUID projectId);
    List<ProjectEntity> findByUserId(UUID userId);
    List<ProjectEntity> findByUserIdAndCategoryId(UUID userId, UUID categoryId);
    List<ProjectEntity> findByUserIdAndIsFavoriteTrue(UUID userId);
    void deleteByCategoryId(UUID categoryId);
}
