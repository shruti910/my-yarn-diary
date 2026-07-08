package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.JournalLogRequest;
import com.crochet.ai.crochetservice.entity.JournalLog;
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
public class JournalLogController {

    private final CrochetService crochetService;

    @Autowired
    public JournalLogController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping("/projects/{projectId}/logs")
    public ResponseEntity<List<JournalLog>> getJournalLogs(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching journal logs for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getJournalLogs(userId, projectId));
    }

    @PostMapping("/projects/{projectId}/logs")
    public ResponseEntity<JournalLog> createJournalLog(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody JournalLogRequest request) {
        log.info("Creating journal log entry for projectId: {} by user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.createJournalLog(userId, projectId, request));
    }

    @GetMapping("/logs/{logId}")
    public ResponseEntity<JournalLog> getJournalLogDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String logId) {
        log.info("Fetching journal log ID: {} for user: {}", logId, userId);
        return ResponseEntity.ok(crochetService.getJournalLogDetails(userId, logId));
    }

    @PutMapping("/logs/{logId}")
    public ResponseEntity<JournalLog> updateJournalLog(@RequestHeader("X-User-Id") String userId,
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
