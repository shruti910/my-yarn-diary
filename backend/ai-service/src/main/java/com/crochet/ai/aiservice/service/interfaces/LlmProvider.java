package com.crochet.ai.aiservice.service.interfaces;

import com.crochet.ai.aiservice.dto.LlmRequest;
import com.crochet.ai.aiservice.dto.LlmResponse;

public interface LlmProvider {
    LlmResponse executeChat(LlmRequest request);
}
