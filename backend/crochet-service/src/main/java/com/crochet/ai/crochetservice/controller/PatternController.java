package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.service.CrochetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/projects/{projectId}/patterns")
    public ResponseEntity<List<PatternResponse>> getProjectPatterns(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching patterns for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getProjectPatterns(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/patterns")
    public ResponseEntity<PatternResponse> addProjectPattern(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody ProjectPatternRequest request) {
        log.info("Adding pattern of type: {} to projectId: {}", request.patternType(), projectId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.addProjectPattern(userId, projectId, request));
    }

    @PutMapping("/patterns/{patternId}")
    public ResponseEntity<PatternResponse> updateProjectPattern(@RequestHeader("X-User-Id") String userId,
            @PathVariable String patternId,
            @RequestBody ProjectPatternRequest request) {
        log.info("Updating patternId: {} for user: {}", patternId, userId);
        return ResponseEntity.ok(crochetService.updateProjectPattern(userId, patternId, request));
    }

    @DeleteMapping("/patterns/{patternId}")
    public ResponseEntity<Void> deleteProjectPattern(@RequestHeader("X-User-Id") String userId,
            @PathVariable String patternId) {
        log.info("Deleting patternId: {} for user: {}", patternId, userId);
        crochetService.deleteProjectPattern(userId, patternId);
        return ResponseEntity.noContent().build();
    }
}
