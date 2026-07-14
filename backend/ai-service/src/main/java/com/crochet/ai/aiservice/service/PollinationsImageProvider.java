package com.crochet.ai.aiservice.service;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.crochet.ai.aiservice.dto.ChatCategory;
import com.crochet.ai.aiservice.dto.LlmRequest;
import com.crochet.ai.aiservice.dto.LlmResponse;

import com.crochet.ai.aiservice.interfaces.LlmProvider;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import java.net.URLEncoder;
import java.util.Base64;

@Component("pollinationsProvider")
@ConditionalOnExpression("'${llm.image-generation-provider}' == 'pollinations'")
@Slf4j
public class PollinationsImageProvider implements LlmProvider {
    private final RestTemplate restTemplate;

    public PollinationsImageProvider() {
        this.restTemplate = new RestTemplate();
    }

    @Value("${llm.image-generation-token-cost:2500}")
    private int imageGenerationTokenCost;

    @Value("${llm.image-generation-default-width:512}")
    private int imageGenerationDefaultWidth;

    @Value("${llm.image-generation-default-height:512}")
    private int imageGenerationDefaultHeight;

    @Value("${llm.image-generation-default-model:flux}")
    private String imageGenerationDefaultModel;

    @Override
    public LlmResponse executeChat(LlmRequest request) {

        if (request.category() == ChatCategory.IMAGE_GENERATOR) {
            return generateImage(request);
        } else {
            log.error("Invalid chat category for Pollinations.ai Provider: {}", request.category());
            throw new UnsupportedOperationException("This provider does not support this chat category");
        }
    }

    private LlmResponse generateImage(LlmRequest request) {
        int width = imageGenerationDefaultWidth;
        int height = imageGenerationDefaultHeight;
        String model = imageGenerationDefaultModel;

        try {

            if (request.latestPrompt() == null || request.latestPrompt().isBlank()) {
                return new LlmResponse(
                        null, 0, 0, 0, "pollinations", model, null, null,
                        "Prompt is blank or empty. Please provide a valid prompt.");
            }

            String encodedPrompt = URLEncoder.encode(request.latestPrompt(), StandardCharsets.UTF_8);

            String url = String.format(
                    "https://image.pollinations.ai/prompt/%s?width=%d&height=%d&nologo=true&private=true&safe=true&model=%s",
                    encodedPrompt, width, height, model);

            log.info("Generating image via Pollinations.ai");

            byte[] imageBytes = restTemplate.getForObject(url, byte[].class);

            if (imageBytes != null && imageBytes.length > 0) {
                String base64Data = Base64.getEncoder().encodeToString(imageBytes);
                String formattedDataUri = "data:image/jpeg;base64," + base64Data;

                log.info(" Image generated successfully from Pollinations.ai!");

                return new LlmResponse(
                        null,
                        0,
                        imageGenerationTokenCost,
                        0,
                        "pollinations.ai",
                        model,
                        null,
                        formattedDataUri,
                        null);
            }
        } catch (Exception e) {
            log.error("Error communicating with Pollinations.ai Image API", e);
            return new LlmResponse(
                    null, 0, 0, 0, "pollinations.ai", model, null, null,
                    "The image generation service is currently busy. Please wait a few seconds and try again.");
        }

        return new LlmResponse(
                null, 0, 0, 0, "pollinations", model, null, null,
                "The image generation service returned empty data. Please adjust your prompt and try again.");

    }

}