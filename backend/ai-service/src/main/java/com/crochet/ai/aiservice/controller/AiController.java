package com.crochet.ai.aiservice.controller;

import lombok.extern.slf4j.Slf4j;

import com.crochet.ai.aiservice.dto.*;
import com.crochet.ai.aiservice.service.AiService;
import com.crochet.ai.aiservice.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

@Slf4j
@RestController
@RequestMapping("/api/v1")
public class AiController {

    private final AiService aiService;

    @Autowired
    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/chats")
    public ResponseEntity<PagedResponse<ChatSessionDto>> getSessions(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false, name = "category") String category,
            @PageableDefault(page = 0, size = 10, sort = { "pinned",
                    "createdAt" }, direction = Sort.Direction.DESC) Pageable pageable) {

        log.info("Fetching paginated active AI chats for user: {}, category: {}, pageable: {}",
                userId, category, pageable);
        Page<ChatSessionDto> result = aiService.getSessions(userId, category, pageable);
        return ResponseEntity.ok(PagedResponse.fromPage(result));
    }

    @GetMapping("/chats/{chatId}")
    public ResponseEntity<ChatSessionDto> getSessionDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable String chatId) {
        log.info("Retrieving chat session message trace for chatId: {} by user: {}", chatId, userId);
        return ResponseEntity.ok(aiService.getSessionDetails(userId, chatId));
    }

    @PostMapping("/chats")
    public ResponseEntity<ChatSessionDto> createSession(@RequestHeader("X-User-Id") String userId,
            @RequestBody @jakarta.validation.Valid ChatCreateRequest request) {
        log.info("Creating a new AI chat session for user: {}", userId);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(aiService.createSession(userId, request));
    }

    @PostMapping("/chats/{chatId}/messages")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Terminology", defaultValue = "US") String userTerminology,
            @PathVariable String chatId,
            @RequestBody @jakarta.validation.Valid MessageRequest request) {
        log.info("Sending message to AI chat session: {} by user: {}", chatId, userId);
        if (userTerminology != null && !"US".equalsIgnoreCase(userTerminology)
                && !"UK".equalsIgnoreCase(userTerminology)) {
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
            @RequestBody @jakarta.validation.Valid ChatUpdateRequest request) {
        log.info("Updating AI chat session: {} for user: {}", chatId, userId);
        return ResponseEntity.ok(aiService.updateSession(userId, chatId, request));
    }

    @DeleteMapping("/chats/user/{targetUserId}")
    public ResponseEntity<Void> deleteAllChatsForUser(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable String targetUserId) {
        log.warn("Purging all AI chats for user: {} (authenticated: {})", targetUserId, authenticatedUserId);
        if (authenticatedUserId == null || !authenticatedUserId.equalsIgnoreCase(targetUserId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        aiService.deleteAllUserData(targetUserId);
        return ResponseEntity.noContent().build();
    }
}
