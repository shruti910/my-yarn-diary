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
public class HookController {

    private final CrochetService crochetService;

    @Autowired
    public HookController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping("/projects/{projectId}/hooks")
    public ResponseEntity<List<HookResponse>> getHooks(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching all hooks for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getHooks(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/hooks")
    public ResponseEntity<HookResponse> addHook(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody HookRequest request) {
        log.info("Adding new hook to projectId: {} for user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.addHook(userId, projectId, request));
    }

    @GetMapping("/hooks/{hookId}")
    public ResponseEntity<HookResponse> getHookDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long hookId) {
        log.info("Fetching hook ID: {} for user: {}", hookId, userId);
        return ResponseEntity.ok(crochetService.getHookDetails(userId, hookId));
    }

    @PutMapping("/hooks/{hookId}")
    public ResponseEntity<HookResponse> updateHook(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long hookId,
            @RequestBody HookRequest request) {
        log.info("Updating hook ID: {} for user: {}", hookId, userId);
        return ResponseEntity.ok(crochetService.updateHook(userId, hookId, request));
    }

    @PatchMapping("/hooks/{hookId}")
    public ResponseEntity<HookResponse> patchHook(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long hookId,
            @RequestBody HookRequest request) {
        log.info("Patching hook ID: {} for user: {}", hookId, userId);
        return ResponseEntity.ok(crochetService.patchHook(userId, hookId, request));
    }

    @DeleteMapping("/hooks/{hookId}")
    public ResponseEntity<Void> deleteHook(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long hookId) {
        log.info("Deleting hook ID: {} for user: {}", hookId, userId);
        crochetService.deleteHook(userId, hookId);
        return ResponseEntity.noContent().build();
    }
}
