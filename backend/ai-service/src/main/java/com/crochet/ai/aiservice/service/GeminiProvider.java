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

    @Value("${gemini.api.base-url}")
    private String geminiBaseUrl;

    @Value("${gemini.api.text-model}")
    private String geminiTextModel;

    @Value("${gemini.api.image-model}")
    private String geminiImageModel;

    public GeminiProvider() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public LlmResponse executeChat(LlmRequest request) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("Gemini API key is not configured");
            return new LlmResponse(
                    null, 0, 0, 0, "google", geminiTextModel, null, null,
                    "System Configuration Error: Please Try Again Later.");
        }

        if (request.category() == ChatCategory.IMAGE_GENERATOR) {
            return generateImage(request);
        }

        String modelName = geminiTextModel;

        try {
            String url = geminiBaseUrl + "/models/" + modelName + ":generateContent?key=" + geminiApiKey;

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
                        responseBody, null, null);
            }
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            log.error("Rate limit exceeded for Gemini Chat API (429): {}", e.getResponseBodyAsString());
            return new LlmResponse(null, 0, 0, 0, "google", modelName, null, null,
                    "You have hit the rate limit for text requests. Please wait about 60 seconds before sending another message!");
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("HTTP error calling Gemini Chat API ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return new LlmResponse(null, 0, 0, 0, "google", modelName, null, null,
                    "The AI service returned an error. Please try again shortly.");
        } catch (Exception e) {
            log.error("Unexpected error during chat execution", e);
            return new LlmResponse(null, 0, 0, 0, "google", modelName, null, null,
                    "Our AI service is experiencing high traffic or is temporarily unavailable. Please try again later.");
        }

        return new LlmResponse(
                null, 0, 0, 0, "google", modelName, null, null,
                "Our AI service is experiencing high traffic or is temporarily unavailable. Please try again later.");
    }

    private LlmResponse generateImage(LlmRequest request) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("Gemini API key is not configured for image generation");
            return new LlmResponse(
                    null, 0, 0, 0, "google", geminiImageModel, null, null,
                    "System Configuration Error: Please Try Again Later.");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", geminiApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", geminiImageModel);

            List<Map<String, Object>> inputList = new ArrayList<>();
            Map<String, Object> inputItem = new HashMap<>();
            inputItem.put("type", "text");
            inputItem.put("text", request.latestPrompt() != null ? request.latestPrompt() : "");
            inputList.add(inputItem);

            requestBody.put("input", inputList);

            Map<String, Object> responseFormat = new HashMap<>();
            responseFormat.put("type", "image");
            responseFormat.put("aspect_ratio", "5:4");
            responseFormat.put("image_size", "512");

            requestBody.put("response_format", responseFormat);

            String instructions = getSystemInstructions(request.category());
            if (instructions != null && !instructions.isBlank()) {
                requestBody.put("system_instruction", instructions);
            }
            String url = geminiBaseUrl + "/interactions";

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            log.info("Response Body:{}", response.getBody().toString());

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map responseBody = response.getBody();

                Map<String, Object> interaction = null;
                if (responseBody.containsKey("interaction")) {
                    interaction = (Map<String, Object>) responseBody.get("interaction");
                } else {
                    interaction = responseBody;
                }

                String base64Data = null;

                if (interaction != null) {
                    Object outputImageObj = interaction.get("output_image");
                    if (outputImageObj == null) {
                        outputImageObj = interaction.get("outputImage");
                    }

                    if (outputImageObj instanceof Map) {
                        Map<String, Object> outputImageMap = (Map<String, Object>) outputImageObj;
                        base64Data = (String) outputImageMap.get("data");
                    } else if (outputImageObj instanceof String) {
                        base64Data = (String) outputImageObj;
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

                if (base64Data != null) {
                    String formattedDataUri = base64Data.startsWith("data:") ? base64Data
                            : "data:image/png;base64," + base64Data;
                    return new LlmResponse(null, promptTokens, completionTokens, reasoningTokens, "google",
                            geminiImageModel, responseBody, formattedDataUri, null);
                }
            }
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            log.error("Rate limit exceeded for Gemini Image API (429): {}", e.getResponseBodyAsString());
            return new LlmResponse(null, 0, 0, 0, "google", geminiImageModel, null, null,
                    "You have exceeded Google's free-tier image generation rate limits. Please wait a minute before generating another image!");
        } catch (org.springframework.web.client.HttpClientErrorException.BadRequest e) {
            log.error("Bad Request sent to Gemini Image API (400): {}", e.getResponseBodyAsString());
            return new LlmResponse(null, 0, 0, 0, "google", geminiImageModel, null, null,
                    "The image request was flagged as invalid. Try adjusting your description to be safer or simpler.");
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("HTTP error calling Gemini Image API ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return new LlmResponse(null, 0, 0, 0, "google", geminiImageModel, null, null,
                    "Image generation service encountered an error. Please try again shortly.");
        } catch (Exception e) {
            log.error("Unexpected error during image generation", e);
            return new LlmResponse(null, 0, 0, 0, "google", geminiImageModel, null, null,
                    "An unexpected error occurred while generating your image. Please try again later.");
        }

        return new LlmResponse(
                null,
                0, 0, 0, "google", geminiImageModel, null, null,
                "An unexpected error occurred while generating your image. Please try again later.");
    }

    private String getSystemInstructions(ChatCategory category) {
        if (category == ChatCategory.PATTERN_DECODER) {
            return "# Purpose\n"
                    + "You are an expert AI crochet pattern decoder, specializing in transforming crochet shorthand, symbols, stitch diagrams, and cryptic instructions into clear, step-by-step, beginner-friendly written patterns.\n"
                    + "\n"
                    + "# Crochet Analysis Instructions\n"
                    + "1. Transcribe and decode shorthand text (e.g., convert \"ch 3, 2 dc in next st, rep from * to end\" into full sentences).\n"
                    + "2. Explicitly detect whether the document uses US or UK terminology (e.g., searching for \"sc\" indicates US; \"tr\" without context may indicate UK).\n"
                    + "3. If a visual stitch diagram/symbol is provided, analyze it and integrate the stitch information into the textual pattern for accuracy.\n"
                    + "4. Output a structured, easy-to-follow crochet pattern based on your analysis.\n"
                    + "\n"
                    + "# Formatting the Output\n"
                    + "- **Project Overview**: What item this pattern will create (e.g., a granny square blanket, a raglan sweater sleeve).\n"
                    + "- **Difficulty level**: Beginner, Intermediate, Advanced.\n"
                    + "- **Required Materials**: Yarn type, hook or needle size, any additional tools (e.g., buttons, stitch markers).\n"
                    + "- **Terminology**: Clearly state \"US Terminology\" or \"UK Terminology\" and ensure all instructions follow this consistently.\n"
                    + "- **Stitch Key**: List all abbreviations and stitches used with their full definitions. Highlight any pattern-specific stitches.\n"
                    + "- **Pattern Instructions**: Step-by-step rows, rounds, or repeats. Use clear language and correct crochet terminology.\n"
                    + "- **Suggested Projects**: Creative ideas for using the pattern (e.g., what other items could be made).\n"
                    + "- **Tips & Notes**: Include advice on yarn substitution, sizing adjustments, or common pitfalls.\n"
                    + "\n"
                    + "# Edge Cases and Ambiguity\n"
                    + "- **Incomplete patterns**: If the image cuts off, append a warning: \"⚠️ Note: The pattern image provided cuts off at Row X. Please upload the remaining sections when you're ready to continue!\"\n"
                    + "- **Illegible text**: If text is blurry, respond: \"I want to make sure your row count stays perfect! The text in this image is a bit too blurry to read reliably. Could you flatten the page and share a clear, high-resolution shot?\"\n"
                    + "- **Unclear terminology**: If unsure about US/UK terms, state: \"I'm using [US/UK] terminology based on available context. Please let me know if you prefer [other terminology]\"\n"
                    + "\n"
                    + "# Tone and Style\n"
                    + "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.\n"
                    + "\n"
                    + "# Instructions\n"
                    + "Analyze the crochet shorthand or instructions provided and produce a clear, beginner-friendly pattern following the formatting guidelines. Ensure accuracy in stitch counts, terminology, and construction.\n";
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
            return """


                                                    You are a master generative textile modeling engine and digital fiber art
                    s synthesizer. Your mission is to take user text descriptions and render them directly into high-fidelity, photorealistic visual assets, specializing in the realistic preservation of handmade crafts, crochet textures, a


                                                    1. **Prioritize Fabric Architecture**: When rendering yarn or textiles, you must emphasize realistic physical properties. Render visible ply twists, realistic yarn halos (soft wool fuzz), clear row transitions, and authentic stitch-by-stitch definitions (e.g., waffle stitch, single crochet loops, or g
                                                    2. **Apply Professional Craft Presentation**: Unless the user specifies a background, default to displaying the item in a clean, high-quality setting. Use soft, diffused morning side-lighting or warm studio ambient lighting. Favor composition styles like ultra-sharp macro close-ups or modern top-down flatlays on neutral wooden or linen backgrounds with a sha
                                                    3. **Incorporate App Aesthetics**: Automatically give all textile creations a cozy, high-quality, authentic handm

                                                    # Guardrails &
                                                    - **Strict Content Moderation & Safety Override**: Do not under any circumstances generate images containing sexually explicit material, adult content, nudity, extreme violence, gore, hate speech, or offensive and harmful imagery. If a user request prompts for something unsafe, inappropriate, or sexually explicit, you must explicitly reject the request by rendering an image of a clean, neutral background card displaying the clear, legible printed text: "Sorry, I cannot fu
                                                    - **Defensive Craft Alignment**: If a user submits a prompt for an object that is completely unrelated to crafts, fiber arts, or home decorations (e.g., "a sports car" or "a spaceship"), do not reject it. Instead, creatively render that object *as if it were entirely made out of crochet yarn* (e.g., a miniature amigurumi sports car with tig
                                                    - **Strict Knit vs. Crochet Separation**: Do not mix or blur distinct needlecraft techniques. Never generate hybrid anomalies like "knitted crochet surfaces." If a user asks for a crochet texture, keep loops grounded strictly in crochet geometry. If they ask for a knit style, implement clean, recognizable stitch textures like the Tunisian knit stitch or standard gart
                                                    - **Physical Geometry Compliance**: Do not render textures that defy physical fiber logic, such as a transparent glass yarn loop or a crochet lace blanket strong enough to suspend heavy metallic blocks. Maintain realistic fabric weight, gravity draping,


                                                    Deliver highly creative, aesthetically beautiful, and technically accurate fiber art imagery that proudly highlights the intricate detail of handmade craftsmanship while strictly maintaining safety compliance.
                                 """;
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
