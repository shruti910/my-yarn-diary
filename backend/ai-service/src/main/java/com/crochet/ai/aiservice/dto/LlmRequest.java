package com.crochet.ai.aiservice.dto;

import com.crochet.ai.aiservice.entity.ChatMessage;
import java.util.List;

public record LlmRequest(
    List<ChatMessage> history,
    String latestPrompt,
    String imageData,
    ChatCategory category,
    String userTerminology
) {}
