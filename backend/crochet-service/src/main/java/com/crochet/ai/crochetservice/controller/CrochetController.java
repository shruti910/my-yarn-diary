package com.crochet.ai.crochetservice.controller;

import lombok.extern.slf4j.Slf4j;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.entity.CategoryEntity;
import com.crochet.ai.crochetservice.entity.JournalLogEntity;
import com.crochet.ai.crochetservice.entity.ProjectEntity;
import com.crochet.ai.crochetservice.service.CrochetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class CrochetController {

    private final CrochetService crochetService;

    @Autowired
    public CrochetController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    // --- CATEGORIES ---

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryEntity>> getCategories(@RequestHeader("X-User-Id") String userId) {
        log.info("Fetching all categories for user: {}", userId);
        return ResponseEntity.ok(crochetService.getCategories(userId));
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryEntity> createCategory(@RequestHeader("X-User-Id") String userId,
            @RequestBody CategoryRequest request) {
        log.info("Creating new category: '{}' for user: {}", request.getName(), userId);
        return ResponseEntity.ok(crochetService.createCategory(userId, request));
    }

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@RequestHeader("X-User-Id") String userId,
            @PathVariable String categoryId) {
        log.info("Deleting categoryId: {} for user: {}", categoryId, userId);
        crochetService.deleteCategory(userId, categoryId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/categories/{categoryId}")
    public ResponseEntity<CategoryEntity> updateCategory(@RequestHeader("X-User-Id") String userId,
            @PathVariable String categoryId,
            @RequestBody CategoryRequest request) {
        log.info("Updating categoryId: {} for user: {} to new name: '{}'", categoryId, userId, request.getName());
        return ResponseEntity.ok(crochetService.updateCategory(userId, categoryId, request));
    }

    // --- PROJECTS ---

    @GetMapping("/projects")
    public ResponseEntity<List<ProjectEntity>> getProjects(@RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false, name = "folderId") String folderId) {
        log.info("Fetching projects list for user: {} (folderId context: {})", userId, folderId);
        return ResponseEntity.ok(crochetService.getProjects(userId, folderId));
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ProjectEntity> getProjectDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching project details for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getProjectDetails(userId, projectId));
    }

    @PostMapping("/projects")
    public ResponseEntity<ProjectEntity> createProject(@RequestHeader("X-User-Id") String userId,
            @RequestBody ProjectRequest request) {
        log.info("Creating project: '{}' for user: {} with status: {}", request.getTitle(), userId, request.getStatus());
        return ResponseEntity.ok(crochetService.createProject(userId, request));
    }

    @PutMapping("/projects/{projectId}")
    public ResponseEntity<ProjectEntity> updateProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody ProjectRequest request) {
        log.info("Updating projectId: {} for user: {} (new status: {})", projectId, userId, request.getStatus());
        return ResponseEntity.ok(crochetService.updateProject(userId, projectId, request));
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<Void> deleteProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Deleting projectId: {} for user: {}", projectId, userId);
        crochetService.deleteProject(userId, projectId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/favorites")
    public ResponseEntity<List<ProjectEntity>> getFavoriteProjects(@RequestHeader("X-User-Id") String userId) {
        log.info("Fetching favorite projects for user: {}", userId);
        return ResponseEntity.ok(crochetService.getFavoriteProjects(userId));
    }

    @PostMapping("/projects/{projectId}/favorite")
    public ResponseEntity<ProjectEntity> toggleFavoriteProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Toggling favorite status for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.toggleFavoriteProject(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/duplicate")
    public ResponseEntity<ProjectEntity> duplicateProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Duplicating project: {} for user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.duplicateProject(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/archive")
    public ResponseEntity<ProjectEntity> toggleArchiveProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Toggling archive status for project: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.toggleArchiveProject(userId, projectId));
    }

    // --- JOURNAL LOGS ---

    @GetMapping("/projects/{projectId}/logs")
    public ResponseEntity<List<JournalLogEntity>> getJournalLogs(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching journal logs for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getJournalLogs(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/logs")
    public ResponseEntity<JournalLogEntity> createJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody JournalLogRequest request) {
        log.info("Creating journal log entry for projectId: {} by user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.createJournalLog(userId, projectId, request));
    }

    @PutMapping("/projects/logs/{logId}")
    public ResponseEntity<JournalLogEntity> updateJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String logId,
            @RequestBody JournalLogRequest request) {
        log.info("Updating journal log ID: {} for user: {}", logId, userId);
        return ResponseEntity.ok(crochetService.updateJournalLog(userId, logId, request));
    }

    @DeleteMapping("/projects/logs/{logId}")
    public ResponseEntity<Void> deleteJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String logId) {
        log.info("Deleting journal log ID: {} for user: {}", logId, userId);
        crochetService.deleteJournalLog(userId, logId);
        return ResponseEntity.noContent().build();
    }

    // --- HUB GALLERY ---

    @GetMapping("/gallery")
    public ResponseEntity<List<GalleryItemResponse>> getUserMediaGallery(@RequestHeader("X-User-Id") String userId) {
        log.info("Fetching unified media gallery assets for user: {}", userId);
        return ResponseEntity.ok(crochetService.getUserMediaGallery(userId));
    }
}
