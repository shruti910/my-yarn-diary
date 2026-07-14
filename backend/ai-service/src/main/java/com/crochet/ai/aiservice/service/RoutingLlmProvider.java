package com.crochet.ai.aiservice.service;

import com.crochet.ai.aiservice.dto.ChatCategory;
import com.crochet.ai.aiservice.dto.LlmRequest;
import com.crochet.ai.aiservice.dto.LlmResponse;
import com.crochet.ai.aiservice.interfaces.LlmProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Primary
@Slf4j
public class RoutingLlmProvider implements LlmProvider {

    private final Map<String, LlmProvider> providerMap;

    @Value("${llm.text-generation-provider:gemini}")
    private String textProviderName;

    @Value("${llm.image-generation-provider:pollinations}")
    private String imageProviderName;

    // Spring autowires a map of all active LlmProvider beans currently in the
    // application context
    public RoutingLlmProvider(Map<String, LlmProvider> providerMap) {
        this.providerMap = providerMap;
    }

    @Override
    public LlmResponse executeChat(LlmRequest request) {
        if (request.category() == ChatCategory.IMAGE_GENERATOR) {
            String targetBean = imageProviderName.toLowerCase() + "Provider";
            return routeTo(targetBean, request);
        } else {
            String targetBean = textProviderName.toLowerCase() + "Provider";
            return routeTo(targetBean, request);
        }
    }

    private LlmResponse routeTo(String beanName, LlmRequest request) {
        LlmProvider provider = providerMap.get(beanName);
        if (provider == null) {
            log.error("Routing failed: Bean '{}' is not registered or active in the context.", beanName);
            return new LlmResponse(null, 0, 0, 0, "system", "router", null, null,
                    "Our AI service is currently unavailable. Please try again later.");
        }
        return provider.executeChat(request);
    }
}