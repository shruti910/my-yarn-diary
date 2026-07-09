package com.crochet.ai.aiservice.controller;

import lombok.extern.slf4j.Slf4j;

import com.crochet.ai.aiservice.dto.*;
import com.crochet.ai.aiservice.service.AiService;
import com.crochet.ai.aiservice.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;

    @Autowired
    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/chats")
    public ResponseEntity<List<ChatSessionDto>> getSessions(@RequestHeader("X-User-Id") String userId) {
        log.info("Fetching all active AI chats for user: {}", userId);
        return ResponseEntity.ok(aiService.getSessions(userId));
    }

    @GetMapping("/chats/{chatId}")
    public ResponseEntity<ChatSessionDto> getSessionDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String chatId) {
        log.info("Retrieving chat session message trace for chatId: {} by user: {}", chatId, userId);
        return ResponseEntity.ok(aiService.getSessionDetails(userId, chatId));
    }

    @PostMapping("/chats")
    public ResponseEntity<ChatSessionDto> createSession(@RequestHeader("X-User-Id") String userId,
            @RequestBody ChatCreateRequest request) {
        log.info("Creating a new AI chat workspace: '{}' for user: {}", request.getTitle(), userId);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(aiService.createSession(userId, request));
    }

    @PostMapping("/chats/{chatId}/messages")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Terminology", defaultValue = "US") String userTerminology,
            @PathVariable String chatId,
            @RequestBody MessageRequest request) {
        log.info("Sending message to AI chat session: {} by user: {} (prompt excerpt: '{}')",
                chatId, userId, request.getText().substring(0, Math.min(request.getText().length(), 40)));
        if (userTerminology != null && !"US".equalsIgnoreCase(userTerminology) && !"UK".equalsIgnoreCase(userTerminology)) {
            throw new BadRequestException("Invalid terminology preference. Must be US or UK.");
        }
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(aiService.sendMessage(userId, chatId, request, userTerminology));
    }

    @DeleteMapping("/chats/{chatId}")
    public ResponseEntity<Void> deleteSession(@RequestHeader("X-User-Id") String userId, @PathVariable String chatId) {
        log.info("Terminating AI chat session: {} for user: {}", chatId, userId);
        aiService.deleteSession(userId, chatId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/chats/{chatId}")
    public ResponseEntity<ChatSessionDto> updateSession(@RequestHeader("X-User-Id") String userId,
            @PathVariable String chatId,
            @RequestBody ChatUpdateRequest request) {
        log.info("Updating AI chat session: {} for user: {} with new title: '{}'", chatId, userId, request.getTitle());
        return ResponseEntity.ok(aiService.updateSession(userId, chatId, request));
    }
}
