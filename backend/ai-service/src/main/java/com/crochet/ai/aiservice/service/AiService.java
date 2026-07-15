package com.crochet.ai.aiservice.service;

import com.crochet.ai.aiservice.dto.*;
import com.crochet.ai.aiservice.entity.ChatMessage;
import com.crochet.ai.aiservice.entity.ChatRole;
import com.crochet.ai.aiservice.entity.ChatSession;
import com.crochet.ai.aiservice.entity.UserRateLimit;
import com.crochet.ai.aiservice.exception.*;
import com.crochet.ai.aiservice.interfaces.LlmProvider;
import com.crochet.ai.aiservice.repository.ChatMessageRepository;
import com.crochet.ai.aiservice.repository.ChatSessionRepository;
import com.crochet.ai.aiservice.repository.UserRateLimitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.extern.slf4j.Slf4j;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AiService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRateLimitRepository userRateLimitRepository;
    private final LlmProvider llmProvider;

    @Autowired
    public AiService(ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            UserRateLimitRepository userRateLimitRepository,
            LlmProvider llmProvider) {
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRateLimitRepository = userRateLimitRepository;
        this.llmProvider = llmProvider;
    }

    public Page<ChatSessionDto> getSessions(String userId, String categoryStr, Pageable pageable) {
        UUID userUuid = UUID.fromString(userId);
        ChatCategory category = null;
        if (categoryStr != null && !categoryStr.isBlank() && !categoryStr.equalsIgnoreCase("all")) {
            category = ChatCategory.fromString(categoryStr);
        }
        Page<ChatSession> sessionsPage = chatSessionRepository.findSessionsForUser(userUuid, category, pageable);
        return sessionsPage.map(this::mapToSessionDto);
    }

    public ChatSessionDto getSessionDetails(String userId, String chatId) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSession session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation thread not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return mapToSessionDto(session);
    }

    @Transactional
    public ChatSessionDto createSession(String userId, ChatCreateRequest request) {
        validateTitle(request.getTitle());
        ChatSession session = ChatSession.builder()
                .chatId(UUID.randomUUID())
                .userId(UUID.fromString(userId))
                .title(request.getTitle())
                .category(request.getCategory())
                .messages(new ArrayList<>())
                .build();

        ChatSession saved = chatSessionRepository.save(session);
        return mapToSessionDto(saved);
    }

    @Transactional
    public ChatMessageDto sendMessage(String userId, String chatId, MessageRequest request, String userTerminology) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSession session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Chat session not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden operation");
        }

        // 1. Pre-Flight Rate Limiter Check
        UserRateLimit rateLimit = userRateLimitRepository.findById(userUuid)
                .orElseGet(() -> UserRateLimit.builder()
                        .userId(userUuid)
                        .dailyTokenBudget(50000)
                        .tokensUsedToday(0)
                        .lastRequestAt(Instant.now())
                        .build());

        Instant now = Instant.now();
        LocalDate today = now.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate lastRequestDate = rateLimit.getLastRequestAt().atZone(ZoneOffset.UTC).toLocalDate();

        if (today.isAfter(lastRequestDate)) {
            rateLimit.setTokensUsedToday(0);
        }
        rateLimit.setLastRequestAt(now);

        if (rateLimit.getTokensUsedToday() >= rateLimit.getDailyTokenBudget()) {
            userRateLimitRepository.save(rateLimit);
            throw new RateLimitExceededException(
                    "Daily chat token budget exceeded! Please try again tomorrow as limit resets at midnight.");
        }

        // 2. Call the active conditional LlmProvider
        LlmRequest llmRequest = new LlmRequest(
                session.getMessages(),
                request.getText(),
                request.getImageData(),
                session.getCategory(),
                userTerminology);

        LlmResponse llmResponse = llmProvider.executeChat(llmRequest);

        // Intercept error messages and return them directly to the client
        if (llmResponse.errorMessage() != null) {
            log.warn("LLM provider returned an operational error: {}", llmResponse.errorMessage());

            return ChatMessageDto.builder()
                    .id(UUID.randomUUID().toString())
                    .role(ChatRole.model.name())
                    .text(null)
                    .imageData(null)
                    .createdAt(LocalDateTime.now())
                    .errorMessage(llmResponse.errorMessage())
                    .build();
        }

        // 3. Save both message rows atomically
        ChatMessage userMsg = ChatMessage.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role(ChatRole.user)
                .textBody(request.getText())
                .imageData(request.getImageData())
                .providerName(llmResponse.providerName())
                .modelName(llmResponse.modelName())
                .promptTokens(0)
                .completionTokens(0)
                .reasoningTokens(0)
                .createdAt(LocalDateTime.now())
                .build();

        ChatMessage modelMsg = ChatMessage.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role(ChatRole.model)
                .textBody(llmResponse.text())
                .imageData(llmResponse.imageResponse())
                .providerName(llmResponse.providerName())
                .modelName(llmResponse.modelName())
                .promptTokens(llmResponse.promptTokens())
                .completionTokens(llmResponse.completionTokens())
                .reasoningTokens(llmResponse.reasoningTokens())
                .metadata(llmResponse.metadata())
                .createdAt(LocalDateTime.now())
                .build();

        session.getMessages().add(userMsg);
        session.getMessages().add(modelMsg);

        chatMessageRepository.save(userMsg);
        chatMessageRepository.save(modelMsg);

        // 4. Increment usage metrics and update running token count
        int totalSpent = llmResponse.promptTokens() + llmResponse.completionTokens() + llmResponse.reasoningTokens();
        session.setTotalTokensConsumed(session.getTotalTokensConsumed() + totalSpent);
        chatSessionRepository.save(session);

        rateLimit.setTokensUsedToday(rateLimit.getTokensUsedToday() + totalSpent);
        userRateLimitRepository.save(rateLimit);

        return ChatMessageDto.builder()
                .id(modelMsg.getMessageId().toString())
                .role(modelMsg.getRole().name())
                .text(modelMsg.getTextBody())
                .imageData(modelMsg.getImageData())
                .createdAt(modelMsg.getCreatedAt())
                .build();
    }

    @Transactional
    public void deleteSession(String userId, String chatId) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSession session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation thread not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden session removal context");
        }
        chatSessionRepository.delete(session);
    }

    @Transactional
    public ChatSessionDto updateSession(String userId, String chatId, ChatUpdateRequest request) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSession session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation thread not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden session update context");
        }
        if (request.title() != null) {
            validateTitle(request.title());
            session.setTitle(request.title());
        }
        if (request.pinned() != null) {
            session.setPinned(request.pinned());
        }
        ChatSession saved = chatSessionRepository.save(session);
        return mapToSessionDto(saved);
    }

    private void validateTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Session title cannot be empty");
        }
        String trimmed = title.trim();
        boolean hasLetterOrDigit = java.util.regex.Pattern.compile("[\\p{L}\\p{N}\\p{IsEmoji}]").matcher(trimmed)
                .find();
        boolean onlyAllowedChars = java.util.regex.Pattern.compile("^[ \\p{L}\\p{N}\\-_()#.\\p{IsEmoji}\\p{M}\\p{Cf}]+$")
                .matcher(trimmed)
                .matches();
        if (!hasLetterOrDigit || !onlyAllowedChars) {
            throw new BadRequestException(
                    "Session title can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis");
        }
    }

    private ChatSessionDto mapToSessionDto(ChatSession session) {
        List<ChatMessageDto> msgs = session.getMessages().stream()
                .map(m -> ChatMessageDto.builder()
                        .id(m.getMessageId().toString())
                        .role(m.getRole().name())
                        .text(m.getTextBody())
                        .imageData(m.getImageData())
                        .createdAt(m.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ChatSessionDto.builder()
                .chatId(session.getChatId().toString())
                .userId(session.getUserId().toString())
                .title(session.getTitle())
                .category(session.getCategory())
                .messages(msgs)
                .createdAt(session.getCreatedAt())
                .pinned(session.isPinned())
                .build();
    }
}
