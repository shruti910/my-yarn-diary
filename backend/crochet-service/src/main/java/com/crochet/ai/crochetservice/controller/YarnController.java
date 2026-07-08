package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.YarnRequest;
import com.crochet.ai.crochetservice.entity.Yarn;
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
public class YarnController {

    private final CrochetService crochetService;

    @Autowired
    public YarnController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping("/projects/{projectId}/yarns")
    public ResponseEntity<List<Yarn>> getYarns(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching all yarns for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getYarns(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/yarns")
    public ResponseEntity<Yarn> addYarn(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody YarnRequest request) {
        log.info("Adding new yarn to projectId: {} for user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.addYarn(userId, projectId, request));
    }

    @GetMapping("/yarns/{yarnId}")
    public ResponseEntity<Yarn> getYarnDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long yarnId) {
        log.info("Fetching yarn ID: {} for user: {}", yarnId, userId);
        return ResponseEntity.ok(crochetService.getYarnDetails(userId, yarnId));
    }

    @PutMapping("/yarns/{yarnId}")
    public ResponseEntity<Yarn> updateYarn(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long yarnId,
            @RequestBody YarnRequest request) {
        log.info("Updating yarn ID: {} for user: {}", yarnId, userId);
        return ResponseEntity.ok(crochetService.updateYarn(userId, yarnId, request));
    }

    @PatchMapping("/yarns/{yarnId}")
    public ResponseEntity<Yarn> patchYarn(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long yarnId,
            @RequestBody YarnRequest request) {
        log.info("Patching yarn ID: {} for user: {}", yarnId, userId);
        return ResponseEntity.ok(crochetService.patchYarn(userId, yarnId, request));
    }

    @DeleteMapping("/yarns/{yarnId}")
    public ResponseEntity<Void> deleteYarn(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long yarnId) {
        log.info("Deleting yarn ID: {} for user: {}", yarnId, userId);
        crochetService.deleteYarn(userId, yarnId);
        return ResponseEntity.noContent().build();
    }
}
