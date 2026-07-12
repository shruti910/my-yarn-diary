package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.crochet.ai.crochetservice.entity.ProjectStatus;
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

       @Query("SELECT p FROM Project p WHERE p.userId = :userId " +
                     "AND (:categoryId IS NULL OR p.categoryId = :categoryId) " +
                     "AND (:isFavorite IS NULL OR p.isFavorite = :isFavorite) " +
                     "AND (p.isArchive = :isArchive) " +
                     "AND (:status IS NULL OR p.status = :status) " +
                     "AND (:search IS NULL OR " +
                     "LOWER(p.title) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
       Page<Project> findProjectsForUser(
                     @Param("userId") UUID userId,
                     @Param("categoryId") UUID categoryId,
                     @Param("isFavorite") Boolean isFavorite,
                     @Param("isArchive") boolean isArchive,
                     @Param("status") ProjectStatus status,
                     @Param("search") String search,
                     Pageable pageable);
}
