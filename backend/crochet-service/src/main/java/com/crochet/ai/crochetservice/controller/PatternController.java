package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.ProjectPatternRequest;
import com.crochet.ai.crochetservice.entity.Project;
import com.crochet.ai.crochetservice.service.CrochetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class PatternController {

    private final CrochetService crochetService;

    @Autowired
    public PatternController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @PostMapping("/projects/{projectId}/patterns")
    public ResponseEntity<Project> addProjectPattern(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody ProjectPatternRequest request) {
        log.info("Adding pattern of type: {} to projectId: {}", request.patternType(), projectId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.addProjectPattern(userId, projectId, request));
    }

    @PutMapping("/patterns/{patternId}")
    public ResponseEntity<Project> updateProjectPattern(@RequestHeader("X-User-Id") String userId,
            @PathVariable String patternId,
            @RequestBody ProjectPatternRequest request) {
        log.info("Updating patternId: {} for user: {}", patternId, userId);
        return ResponseEntity.ok(crochetService.updateProjectPattern(userId, patternId, request));
    }

    @DeleteMapping("/patterns/{patternId}")
    public ResponseEntity<Project> deleteProjectPattern(@RequestHeader("X-User-Id") String userId,
            @PathVariable String patternId) {
        log.info("Deleting patternId: {} for user: {}", patternId, userId);
        return ResponseEntity.ok(crochetService.deleteProjectPattern(userId, patternId));
    }
}
