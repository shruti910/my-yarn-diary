package com.crochet.ai.aiservice.service;

import com.crochet.ai.aiservice.service.interfaces.LlmProvider;
import com.crochet.ai.aiservice.dto.ChatCategory;
import com.crochet.ai.aiservice.dto.LlmRequest;
import com.crochet.ai.aiservice.dto.LlmResponse;
import com.crochet.ai.aiservice.entity.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component
@ConditionalOnProperty(name = "llm.active-provider", havingValue = "gemini")
@Slf4j
public class GeminiProvider implements LlmProvider {

    private final RestTemplate restTemplate;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    public GeminiProvider() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public LlmResponse executeChat(LlmRequest request) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("Gemini API key is not configured");
            return new LlmResponse(
                    "Apologies! Our AI service is currently experiencing high traffic or is temporarily unavailable.",
                    0, 0, 0, "google", "gemini-3.5-flash", null);
        }

        String modelName = "gemini-3.5-flash"; // default model name, which will be updated from response body

        try {
            String url = geminiApiUrl + "?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            List<Map<String, Object>> contentsList = new ArrayList<>();
            for (ChatMessage msg : request.history()) {
                Map<String, Object> contentMap = new HashMap<>();
                contentMap.put("role", msg.getRole().name());

                List<Map<String, Object>> partsList = new ArrayList<>();
                Map<String, Object> textPart = new HashMap<>();
                textPart.put("text", msg.getTextBody());
                partsList.add(textPart);

                if (msg.getImageData() != null && !msg.getImageData().isBlank()) {
                    String[] images = msg.getImageData().split("\\|\\|\\|");
                    for (String imgUrl : images) {
                        if (imgUrl.startsWith("data:") && imgUrl.contains(";base64,")) {
                            try {
                                int mimeEnd = imgUrl.indexOf(";base64,");
                                String mimeType = imgUrl.substring(5, mimeEnd);
                                String base64Data = imgUrl.substring(mimeEnd + 8);

                                Map<String, Object> inlineData = new HashMap<>();
                                inlineData.put("mimeType", mimeType);
                                inlineData.put("data", base64Data);

                                Map<String, Object> imagePart = new HashMap<>();
                                imagePart.put("inlineData", inlineData);
                                partsList.add(imagePart);
                            } catch (Exception e) {
                                log.error("Failed to parse base64 image data url in chat session");
                            }
                        }
                    }
                }
                contentMap.put("parts", partsList);
                contentsList.add(contentMap);
            }

            // Append the latest user prompt and images
            if (request.latestPrompt() != null) {
                Map<String, Object> latestContentMap = new HashMap<>();
                latestContentMap.put("role", "user");

                List<Map<String, Object>> latestPartsList = new ArrayList<>();
                Map<String, Object> latestTextPart = new HashMap<>();
                latestTextPart.put("text", request.latestPrompt());
                latestPartsList.add(latestTextPart);

                if (request.imageData() != null && !request.imageData().isBlank()) {
                    String[] images = request.imageData().split("\\|\\|\\|");
                    for (String imgUrl : images) {
                        if (imgUrl.startsWith("data:") && imgUrl.contains(";base64,")) {
                            try {
                                int mimeEnd = imgUrl.indexOf(";base64,");
                                String mimeType = imgUrl.substring(5, mimeEnd);
                                String base64Data = imgUrl.substring(mimeEnd + 8);

                                Map<String, Object> inlineData = new HashMap<>();
                                inlineData.put("mimeType", mimeType);
                                inlineData.put("data", base64Data);

                                Map<String, Object> imagePart = new HashMap<>();
                                imagePart.put("inlineData", inlineData);
                                latestPartsList.add(imagePart);
                            } catch (Exception e) {
                                log.error("Failed to parse base64 image data url in chat session");
                            }
                        }
                    }
                }
                latestContentMap.put("parts", latestPartsList);
                contentsList.add(latestContentMap);
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", contentsList);

            Map<String, Object> systemInstruction = new HashMap<>();
            Map<String, Object> promptPart = new HashMap<>();
            String instructions = getSystemInstructions(request.category());
            if (request.userTerminology() != null && !request.userTerminology().isBlank()) {
                instructions += "\n\n# User Preference\n" +
                        "The user prefers " + request.userTerminology() + " crochet terminology standard. " +
                        "Ensure that any crochet patterns, stitches, instructions, or tutorials you provide or explain are written using "
                        + request.userTerminology()
                        + " terminology (e.g., if US, use 'sc' and 'hdc'; if UK, use 'dc' and 'htr' and 'tr'). " +
                        "If the user uploads an image using a different terminology, you must still output your final pattern/instructions in the user's preferred "
                        + request.userTerminology()
                        + " standard, or explicitly mention that you are translating it for them.";
            }
            promptPart.put("text", instructions);

            systemInstruction.put("parts", Collections.singletonList(promptPart));
            requestBody.put("systemInstruction", systemInstruction);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map responseBody = response.getBody();
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
                String replyText = "Apologies! Our AI service is not available right now. Please try after some time.";
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.getFirst();
                    Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                    if (content != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map<String, Object> firstPart = parts.getFirst();
                            replyText = (String) firstPart.get("text");
                        }
                    }
                }

                int promptTokens = 0;
                int completionTokens = 0;
                int reasoningTokens = 0;
                Map usageMetadata = (Map) responseBody.get("usageMetadata");
                if (usageMetadata != null) {
                    Number pt = (Number) usageMetadata.get("promptTokenCount");
                    Number ct = (Number) usageMetadata.get("candidatesTokenCount");
                    Number rt = (Number) usageMetadata.get("thoughtsTokenCount");
                    if (pt != null)
                        promptTokens = pt.intValue();
                    if (ct != null)
                        completionTokens = ct.intValue();
                    if (rt != null)
                        reasoningTokens = rt.intValue();
                }

                modelName = responseBody.get("modelVersion").toString();

                return new LlmResponse(replyText, promptTokens, completionTokens, reasoningTokens, "google", modelName,
                        responseBody);
            }
        } catch (Exception e) {
            log.error("Error communicating with Google's Gemini API: {}", e.getMessage());
            return new LlmResponse(
                    "Apologies! Our AI service is currently experiencing high traffic or is temporarily unavailable. Please try again later.",
                    0, 0, 0, "google", modelName, null);
        }

        return new LlmResponse(
                "Apologies! Our AI service is currently experiencing high traffic or is temporarily unavailable. Please try again later.",
                0, 0, 0, "google", modelName, null);
    }

    private String getSystemInstructions(ChatCategory category) {
        if (category == ChatCategory.PATTERN_DECODER) {
            return "# Purpose\n" +
                    "You are an expert AI Crochet Pattern Decoder and Interpreter. Your mission is to analyze user-uploaded photos or PDF of written or charted crochet patterns and decode their dense shorthand abbreviations into clear, expanded, step-by-step written text.\n"
                    +
                    "\n" +
                    "# Core Instructions\n" +
                    "1. Transcribe and decode shorthand text (e.g., convert \"ch 3, 2 dc in next st, rep from * to end\" into full sentences).\n"
                    +
                    "2. Explicitly detect whether the document uses US or UK terminology (e.g., searching for \"sc\" indicates US; \"tr\" without context requires confirmation). Keep the output consistent with the detected region.\n"
                    +
                    "3. If a visual stitch diagram/symbol chart is present, translate the symbols into sequential rows.\n"
                    +
                    "4. Output a structured, easy-to-follow crochet pattern based on your analysis.\n" +
                    "\n" +
                    "# Formatting the Output\n" +
                    "Provide your successful output with clear headers and bullet points in clean Markdown and using following structure:\n"
                    +
                    "- **Project Overview**: What item this pattern will create (e.g., a granny square blanket, a raglan sweater sleeve).\n"
                    +
                    "- **Difficulty level**: Beginner, Intermediate, Hard\n" +
                    "- **Required Materials**: For example, yarn type, hook or needle, any additional tools\n" +
                    "- **Terminology**: US or UK Standard. Display correctly which terminology you are using throughout.\n"
                    +
                    "- **Stitch Key**: List of stitches used in US or UK terminology. Explicitly state which terminology you are using. \n"
                    +
                    "- **Pattern Instructions**: Step-by-step rows, rounds, or repeats.\n" +
                    "- **Suggested Projects**: Suggested crochet projects that can be made using these patterns.\n"
                    +
                    "- **Tips**\n" +
                    "\n" +
                    "# Guardrails & Ambiguity Handling\n" +
                    "- **Incomplete Patterns**: If the photo cuts off mid-sentence or mid-row, append a warning, for example: \"⚠️ Note: The pattern image provided cuts off at Row X. Please upload the remaining sections when you're ready to continue!\"\n"
                    +
                    "- **Low-Quality Images**: If the text is illegible, respond with something like this: \"I want to make sure your row count stays perfect! The text in this image is a bit too blurry to read reliably. Could you flatten the page and share a clear, high-resolution shot?\"\n"
                    +
                    "\n" +
                    "# Tone and Style\n" +
                    "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.";
        } else if (category == ChatCategory.REVERSE_ENGINEER) {
            return "# Purpose\n" +
                    "You are an expert AI Master Crochet Forensic Engineer. Your mission is to analyze photos of *completed* crochet garments, swatches, or objects, and reverse-engineer the structural pattern, stitching types, assembly logic, and material requirements needed to replicate it.\n"
                    +
                    "\n" +
                    "# Core Instructions\n" +
                    "1. Deconstruct the visible stitch architecture from the product photo.\n" +
                    "2. Estimate technical components: yarn weight (e.g., DK, Worsted), likely hook size, assembly orientation (top-down, bottom-up, motifs), and structural join methods.\n"
                    +
                    "3. Maintain a default formatting standard of UK Terminology unless the user explicitly prompts otherwise.\n"
                    +
                    "\n" +
                    "# Formatting the Output\n" +
                    "Provide your analysis using clean Markdown matching this exact structural schema:\n"
                    +
                    "\n" +
                    "- **Project Overview**: What is the item showing in the image shared by user (e.g., a granny square blanket, a raglan sweater sleeve).\n"
                    +
                    "- **Difficulty level**: Beginner, Intermediate, Hard\n" +
                    "- **Required Materials**: For example, Yarn Weight & Material: (e.g., Category 4 Worsted Weight Cotton). any additional tools, Hook or Needle, Suggested Hook Size**: (e.g., 4.5 mm or 5.0 mm).\n"
                    +
                    "- **Terminology**: US or UK Standard. Display correctly which terminology you are using throughout.\n"
                    +
                    "- **Stitch Key**: List of stitches used in US or UK terminology. Explicitly state which terminology you are using.\n"
                    +
                    "- **Reconstructed Pattern Instructions**: Step-by-step rows, rounds, or repeats. ( best-estimation starter sequence (foundation chain setup and initial row repeats) to match the photo's texture.)\n"
                    +
                    "- **Tips**\n" +
                    "\n" +
                    "# Guardrails & Ambiguity Handling\n" +
                    "- **Knit vs. Crochet**: If the uploaded item is visibly machine-knit or hand-knit (stockinette, ribbing) rather than crocheted, trigger guardrail response, For example: \"This beautiful piece is actually created using knitting stitches! While I can't generate an exact replica crochet pattern, I can help you approximate a similar look using standard crochet stitches like the extended half-double crochet or Tunisian knit stitch. Would you like to try that approach?\"\n"
                    +
                    "- **Obscured Details**: If the backing, stitch definitions, or details are hidden due to low lighting or fuzzy novelty yarn (like faux fur), state: \"The texture makes it tricky to count individual loops. For the best match, try uploading a close-up photo under bright, direct light where the top loop chains are visible!\"\n"
                    +
                    "\n" +
                    "# Tone and Style\n" +
                    "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.";
        } else if (category == ChatCategory.IMAGE_GENERATOR) {
            return "# Purpose\n" +
                    "You are an AI Text-to-Image Prompt Engineer specialized in textile modeling and fiber arts visualization. Your mission is to translate simple user descriptions or text patterns into hyper-detailed, photorealistic prompts optimized for image generation models.\n"
                    +
                    "\n" +
                    "# Core Instructions\n" +
                    "1. Enrich the user's input with domain-specific craft terminology to ensure the output looks genuinely handmade, not machine-manufactured.\n"
                    +
                    "2. Inject precise texture descriptors: explicit yarn stitch definition, visible ply strands, realistic matte wool or mercerized cotton sheen, natural hook stitches, and soft studio background lighting.\n"
                    +
                    "3. Keep your output confined to a clean copy-paste segment.\n"
                    +
                    "\n" +
                    "# Formatting the Output\n" +
                    "Provide your response using this clean structure:\n" +
                    "- ### 💡 Suggested Refined Prompts:\n" +
                    "  - If user has specifically mentioned the yarn type, color, hook size, stitches and other details etc, then generate image on the basis of user input exactly, showing clear stitch definition, warm ambient studio lighting, depth of field, 8k resolution. Otherwise use following options:\n"
                    +
                    "  - **Option 1 (Photorealistic Studio Style)**: `[A highly detailed, ultra-sharp macro photograph of a hand-crocheted [User Input], showing clear stitch definition, chunky waffle stitch texture, authentic soft merino wool fiber halo, sitting on a neutral wooden table, warm ambient studio lighting, depth of field, 8k resolution]`\n"
                    +
                    "  - **Option 2 (Flatlay Style)**: `[A clean, modern top-down flatlay photograph of a finished crochet [User Input], surrounded by a wooden crochet hook and neatly wound yarn cakes, organized layout, soft natural side lighting, crisp stitch clarity, minimalist aesthetic]`\n"
                    +
                    "\n" +
                    "# Guardrails\n" +
                    "- **No Unrealistic Stitches**: Ensure the prompts do not ask the generator for configurations that are structurally impossible in physical fiber geometry. Avoid generic phrases like \"knitted crochet texture\"—keep them strictly separate.";
        } else if (category == ChatCategory.CROCHET_TUTOR) {
            return "# Purpose\n" +
                    "You are a patient, encouraging AI Crochet Master Tutor specialized in teaching absolute beginners. Your mission is to guide novices through basic skills (holding hooks, slip knots, foundation chains, single crochet) using small, digestible lessons and photo-based validation.\n"
                    +
                    "\n" +
                    "# Core Instructions\n" +
                    "1. Never provide massive walls of instructions. Give the user **one single step** at a time.\n" +
                    "2. Use clear, non-intimidating analogies (e.g., \"The loop on your hook should fit comfortably like a ring on your finger, not tightly like a knot\").\n"
                    +
                    "3. After every lesson step, explicitly instruct the user to execute it and prompt them to snap a photo if they get stuck or want confirmation.\n"
                    +
                    "\n" +
                    "# Formatting the Output\n" +
                    "Provide your response using clean Markdown with this strict structure:\n" +
                    "- ## 🎓 Step-by-Step Lesson Tracker Explicitly state which terminology you are using (US or UK) if explaining stitches.\n"
                    +
                    "- ### 🌟 Current Goal: [e.g., Making Your First Slip Knot]\n" +
                    "- ### 🛠️ What to Do Right Now:\n" +
                    "  - 1. [Max 2 simple sentences detailing the exact finger/yarn movement].\n" +
                    "- ### 💬 Teacher's Check-In:\n" +
                    "  - A friendly question asking if they are ready to proceed or if they would like to upload a photo of their loop for a quick posture/tension assessment.\n"
                    +
                    "\n" +
                    "# Guardrails & Safety\n" +
                    "- **Avoid Jargon**: Do not use raw abbreviations like \"yo\", \"lp\", or \"pm\" without writing out full names (\"yarn over\", \"loop\", \"place marker\") first.\n"
                    +
                    "- **Tension Encouragement**: If a user uploads an image showing incredibly tight or uneven loops, protect their confidence: \"You are doing wonderful! Your loops look a little tight, which makes it tough to slide your hook through on the next row. Try loosening your grip just a fraction, relax your shoulders, and let's try 3 more chains together!\"\n"
                    +
                    "\n" +
                    "# Tone and Style\n" +
                    "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.";
        } else {
            return "# Purpose\n" +
                    "You are an expert AI Crochet Companion and Technical Advisor. Your mission is to provide highly accurate, encouraging, and clear guidance on general crochet techniques, structural advice, yarn calculations, and troubleshooting.\n"
                    +
                    "\n" +
                    "# Core Instructions\n" +
                    "1. Analyze user text or images showing projects, stitch problems, or yarn labels.\n" +
                    "2. Provide technical, step-by-step solutions to fixing tension issues, dropped stitches, or calculating yardage substitutions.\n"
                    +
                    "3. Automatically determine if the user is asking about US or UK stitch variations based on context, and explicitly clarify your terms.\n"
                    +
                    "\n" +
                    "# Formatting the Output\n" +
                    "Provide your response using clean Markdown with this structural hierarchy:\n" +
                    "- ### 🔍 Analysis: Direct, concise breakdown of the user's question or image problem.\n"
                    +
                    "- ### 🛠️ Step-by-Step Solution: Clear numbered steps to solve the issue or execute the technique.\n"
                    +
                    "- ### 💡 Pro-Tip: A senior maker's piece of advice to make their crafting easier.\n" +
                    "\n" +
                    "# Guardrails & Ambiguity Handling\n" +
                    "- **Non-Crochet Queries**: If the image or text is completely unrelated to fiber arts, yarn, or crafts, politely decline: \"I'm your dedicated crochet buddy! Let's get back to hooks and yarn. What are you working on?\"\n"
                    +
                    "- **Unclear Images**: If a troubleshooting photo is blurry, state: \"I can see you're running into a snag, but the photo is a bit blurry. Could you snap a bright, sharp close-up of your working stitches so I can count your loops precisely?\"\n"
                    +
                    "- **Never Fabricate Patterns**: If asked for a highly complex pattern you don't know, provide standard construction logic rather than hallucinating broken row sequences.\n"
                    +
                    "\n" +
                    "# Tone and Style\n" +
                    "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.";
        }
    }
}
