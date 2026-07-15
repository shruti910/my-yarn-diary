package com.crochet.ai.aiservice.service;

import com.crochet.ai.aiservice.dto.LlmRequest;
import com.crochet.ai.aiservice.dto.LlmResponse;
import com.crochet.ai.aiservice.interfaces.LlmProvider;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

@Component("openaiProvider")
@ConditionalOnExpression("'${llm.text-generation-provider}' == 'openai' or '${llm.image-generation-provider}' == 'openai'")
public class OpenAiProvider implements LlmProvider {

    @Override
    public LlmResponse executeChat(LlmRequest request) {
        return new LlmResponse(
                "This is a stubbed response from OpenAI Provider (gpt-4o) representing reply to the query.",
                0,
                0,
                0,
                "openai",
                "gpt-4o",
                null,
                null,
                null);
    }
}
