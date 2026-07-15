package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.service.CrochetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

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
    public ResponseEntity<PagedResponse<ProjectSummaryResponse>> getProjects(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false, name = "categoryId") String categoryId,
            @RequestParam(required = false, name = "favorite") Boolean favorite,
            @RequestParam(required = false, name = "archive") Boolean archive,
            @RequestParam(required = false, name = "status") String status,
            @RequestParam(required = false, name = "search") String search,
            @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Boolean actualArchive = archive;
        if ("archived".equalsIgnoreCase(categoryId)) {
            actualArchive = true;
        }

        log.info(
                "Fetching paginated projects list for user: {} (categoryId: {}, favorite: {}, archive: {}, status: {}, search: {}, pageable: {})",
                userId, categoryId, favorite, actualArchive, status, search, pageable);
        Page<ProjectSummaryResponse> result = crochetService.getProjects(userId, categoryId, favorite, actualArchive,
                status, search, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(result));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProjectDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching project details for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getProjectDetailsResponse(userId, projectId));
    }

    @GetMapping("/{projectId}/full")
    public ResponseEntity<ProjectFullResponse> getProjectFullDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching full project details for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getProjectFullDetailsResponse(userId, projectId));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@RequestHeader("X-User-Id") String userId,
            @RequestBody ProjectRequest request) {
        log.info("Creating project: '{}' for user: {} with status: {}", request.getTitle(), userId,
                request.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.createProject(userId, request));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody ProjectRequest request) {
        log.info("Updating projectId: {} for user: {} (new status: {})", projectId, userId, request.getStatus());
        return ResponseEntity.ok(crochetService.updateProject(userId, projectId, request));
    }

    @PostMapping("/{projectId}/favorite")
    public ResponseEntity<ProjectResponse> toggleFavoriteProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Toggling favorite status for projectId: {} for user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.toggleFavoriteProject(userId, projectId));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Deleting projectId: {} for user: {}", projectId, userId);
        crochetService.deleteProject(userId, projectId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/duplicates")
    public ResponseEntity<ProjectResponse> duplicateProject(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Duplicating project: {} for user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.duplicateProject(userId, projectId));
    }
}
