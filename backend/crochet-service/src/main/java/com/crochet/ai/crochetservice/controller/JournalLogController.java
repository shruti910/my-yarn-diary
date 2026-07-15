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

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class JournalLogController {

    private final CrochetService crochetService;

    @Autowired
    public JournalLogController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping("/projects/{projectId}/logs")
    public ResponseEntity<PagedResponse<JournalLogResponse>> getJournalLogs(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        log.info("Fetching paginated journal logs for projectId: {} and user: {}, pageable: {}",
                projectId, userId, pageable);
        Page<JournalLogResponse> result = crochetService.getJournalLogs(userId, projectId, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(result));
    }

    @PostMapping("/projects/{projectId}/logs")
    public ResponseEntity<JournalLogResponse> createJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody JournalLogRequest request) {
        log.info("Creating journal log entry for projectId: {} by user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.createJournalLog(userId, projectId, request));
    }

    @GetMapping("/logs/{logId}")
    public ResponseEntity<JournalLogResponse> getJournalLogDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String logId) {
        log.info("Fetching journal log ID: {} for user: {}", logId, userId);
        return ResponseEntity.ok(crochetService.getJournalLogDetails(userId, logId));
    }

    @PutMapping("/logs/{logId}")
    public ResponseEntity<JournalLogResponse> updateJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String logId,
            @RequestBody JournalLogRequest request) {
        log.info("Updating journal log ID: {} for user: {}", logId, userId);
        return ResponseEntity.ok(crochetService.updateJournalLog(userId, logId, request));
    }

    @DeleteMapping("/logs/{logId}")
    public ResponseEntity<Void> deleteJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String logId) {
        log.info("Deleting journal log ID: {} for user: {}", logId, userId);
        crochetService.deleteJournalLog(userId, logId);
        return ResponseEntity.noContent().build();
    }
}
