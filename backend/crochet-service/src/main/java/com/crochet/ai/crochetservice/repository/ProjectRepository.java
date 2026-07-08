package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByProjectId(UUID projectId);
    List<Project> findByUserId(UUID userId);
    List<Project> findByUserIdAndCategoryId(UUID userId, UUID categoryId);
    List<Project> findByUserIdAndIsFavoriteTrue(UUID userId);
    void deleteByCategoryId(UUID categoryId);
}
