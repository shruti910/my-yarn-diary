package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.entity.Project;
import com.crochet.ai.crochetservice.service.CrochetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    private final CrochetService crochetService;

    @Autowired
    public ProjectController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getProjects(@RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false, name = "categoryId") String categoryId,
            @RequestParam(required = false, name = "favorite") Boolean favorite) {
        if (Boolean.TRUE.equals(favorite)) {
            log.info("Fetching favorite projects list for user: {}", userId);
            return ResponseEntity.ok(crochetService.getFavoriteProjects(userId));
        }
        log.info("Fetching projects list for user: {} (categoryId context: {})", userId, categoryId);
        return ResponseEntity.ok(crochetService.getProjects(userId, categoryId));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<Project> getProjectDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching project details for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getProjectDetails(userId, projectId));
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestHeader("X-User-Id") String userId,
            @RequestBody ProjectRequest request) {
        log.info("Creating project: '{}' for user: {} with status: {}", request.getTitle(), userId, request.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.createProject(userId, request));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<Project> updateProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody ProjectRequest request) {
        log.info("Updating projectId: {} for user: {} (new status: {})", projectId, userId, request.getStatus());
        return ResponseEntity.ok(crochetService.updateProject(userId, projectId, request));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<Project> patchProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody ProjectPatchRequest request) {
        log.info("Patching projectId: {} for user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.patchProject(userId, projectId, request));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Deleting projectId: {} for user: {}", projectId, userId);
        crochetService.deleteProject(userId, projectId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/duplicates")
    public ResponseEntity<Project> duplicateProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Duplicating project: {} for user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.duplicateProject(userId, projectId));
    }
}
