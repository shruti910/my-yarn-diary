package com.crochet.ai.aiservice.service;

import com.crochet.ai.aiservice.dto.*;
import com.crochet.ai.aiservice.entity.ChatMessageEntity;
import com.crochet.ai.aiservice.entity.ChatSessionEntity;
import com.crochet.ai.aiservice.exception.*;
import com.crochet.ai.aiservice.repository.ChatMessageRepository;
import com.crochet.ai.aiservice.repository.ChatSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final RestTemplate restTemplate;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Autowired
    public AiService(ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository) {
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.restTemplate = new RestTemplate();
    }

    public List<ChatSessionDto> getSessions(String userId) {
        UUID userUuid = UUID.fromString(userId);
        return chatSessionRepository.findByUserIdOrderByCreatedAtDesc(userUuid)
                .stream()
                .map(this::mapToSessionDto)
                .collect(Collectors.toList());
    }

    public ChatSessionDto getSessionDetails(String userId, String chatId) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSessionEntity session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation thread not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return mapToSessionDto(session);
    }

    @Transactional
    public ChatSessionDto createSession(String userId, ChatCreateRequest request) {
        ChatSessionEntity session = ChatSessionEntity.builder()
                .chatId(UUID.randomUUID())
                .userId(UUID.fromString(userId))
                .title(request.getTitle())
                .messages(new ArrayList<>())
                .build();

        ChatSessionEntity saved = chatSessionRepository.save(session);
        return mapToSessionDto(saved);
    }

    @Transactional
    public ChatMessageDto sendMessage(String userId, String chatId, MessageRequest request) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSessionEntity session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation thread not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden operation");
        }

        // 1. Save and append User message
        ChatMessageEntity userMsg = ChatMessageEntity.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role("user")
                .text(request.getText())
                .imageData(request.getImageData())
                .createdAt(LocalDateTime.now())
                .build();
        session.getMessages().add(userMsg);
        chatMessageRepository.save(userMsg);

        // 2. Call external Gemini LLM
        String assistantReply = callGeminiApiKey(session, request.getText());

        // 3. Save and append Model reply
        ChatMessageEntity modelMsg = ChatMessageEntity.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role("model")
                .text(assistantReply)
                .createdAt(LocalDateTime.now())
                .build();
        session.getMessages().add(modelMsg);
        chatMessageRepository.save(modelMsg);

        chatSessionRepository.save(session);

        return ChatMessageDto.builder()
                .id(modelMsg.getMessageId().toString())
                .role(modelMsg.getRole())
                .text(modelMsg.getText())
                .createdAt(modelMsg.getCreatedAt())
                .build();
    }

    @Transactional
    public void deleteSession(String userId, String chatId) {
        UUID chatUuid = UUID.fromString(chatId);
        UUID userUuid = UUID.fromString(userId);
        ChatSessionEntity session = chatSessionRepository.findByChatId(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation thread not found: " + chatId));
        if (!session.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden session removal context");
        }
        chatSessionRepository.delete(session);
    }

    // Connects to Gemini's Official Rest endpoints
    private String callGeminiApiKey(ChatSessionEntity session, String latestPrompt) {
        if (geminiApiKey == null || geminiApiKey.equals("mock-or-inactive-key") || geminiApiKey.isBlank()) {
            return simulateLocalTutorReply(latestPrompt);
        }

        try {
            String url = geminiApiUrl + "?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Translate full chat memory history to standard Gemini payloads
            List<Map<String, Object>> contentsList = new ArrayList<>();
            for (ChatMessageEntity msg : session.getMessages()) {
                Map<String, Object> contentMap = new HashMap<>();
                // Convert JPA entity role to standard "user" / "model"
                contentMap.put("role", msg.getRole().equals("model") ? "model" : "user");

                List<Map<String, Object>> partsList = new ArrayList<>();
                Map<String, Object> textPart = new HashMap<>();
                textPart.put("text", msg.getText());
                partsList.add(textPart);

                if (msg.getImageData() != null && !msg.getImageData().isBlank()) {
                    String imgUrl = msg.getImageData();
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
                            // Log and ignore image parsing error to prevent crashing chat
                        }
                    }
                }
                contentMap.put("parts", partsList);

                contentsList.add(contentMap);
            }

            // Frame body structure
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", contentsList);

            // Inject Custom Crochet System Instructions
            Map<String, Object> systemInstruction = new HashMap<>();
            Map<String, Object> promptPart = new HashMap<>();
            promptPart.put("text", "# Purpose\n" +
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
                    "- ### 🔍 Diagnostic Analysis: Direct, concise breakdown of the user's question or image problem.\n"
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
                    "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.");

            systemInstruction.put("parts", Collections.singletonList(promptPart));
            requestBody.put("systemInstruction", systemInstruction);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map responseBody = response.getBody();
                List candidates = (List) responseBody.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map firstCandidate = (Map) candidates.getFirst();
                    Map content = (Map) firstCandidate.get("content");
                    if (content != null) {
                        List parts = (List) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map firstPart = (Map) parts.getFirst();
                            return (String) firstPart.get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            return "Apologies! I encountered an error communicating with Google’s Gemini API: " + e.getMessage()
                    + ". Let me try answering offline: " + simulateLocalTutorReply(latestPrompt);
        }

        return simulateLocalTutorReply(latestPrompt);
    }

    private String simulateLocalTutorReply(String userMessage) {
        String msg = userMessage.toLowerCase();
        if (msg.contains("pattern") || msg.contains("custom")) {
            return "🌸 **Crochet.ai Tutor Recommendation**:\n\nTo customize your design, I highly recommend modifying the row count constraints. For a standard blanket pattern, you should chain an even multiple of stitches + 1. Try testing out a small gauge swatch (e.g., 10 rows of 10 single crochet stitches) to measure and align your hook size with your brand of yarn!";
        } else if (msg.contains("color") || msg.contains("yarn")) {
            return "🎨 **Yarn Expert Suggestion**:\n\nFor beautiful colorways, high-contrast combinations work best! Try combining sage green with soft apricot or neutral cream. Keep your hook gauge balanced so changes in yarn batch colors do not affect row count heights.";
        } else if (msg.contains("stitch") || msg.contains("chain")) {
            return "🧶 **Crochet Stitch Guide**:\n\nFor a clean border stitch, try using a half double crochet (hdc) or a double crochet (dc). Make sure to count your rows regularly and hit reset using the rows marker controls when you start a new batch!";
        }
        return "👋 Welcome to **Crochet.ai Tutor**! How can I help you customize your patterns, coordinate yarn, or keep track of your active row count tags today?";
    }

    private ChatSessionDto mapToSessionDto(ChatSessionEntity session) {
        List<ChatMessageDto> msgs = session.getMessages().stream()
                .map(m -> ChatMessageDto.builder()
                        .id(m.getMessageId().toString())
                        .role(m.getRole())
                        .text(m.getText())
                        .imageData(m.getImageData())
                        .createdAt(m.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ChatSessionDto.builder()
                .chatId(session.getChatId().toString())
                .userId(session.getUserId().toString())
                .title(session.getTitle())
                .messages(msgs)
                .createdAt(session.getCreatedAt())
                .build();
    }

    @Transactional
    public PatternDecoderResponse decodePattern(String userId, PatternDecoderRequest request) {
        UUID userUuid = UUID.fromString(userId);

        // 1. Create a new Chat Session specifically for this decoding operation
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        ChatSessionEntity session = ChatSessionEntity.builder()
                .chatId(UUID.randomUUID())
                .userId(userUuid)
                .title("AI Pattern Decoder - " + timestamp)
                .messages(new ArrayList<>())
                .build();

        session = chatSessionRepository.save(session);

        // Construct base64 image data URL for database storage
        String imageDataUrl = "data:" + request.imageMime() + ";base64," + request.imageBase64();

        // 2. Save the User query message containing the image
        ChatMessageEntity userMsg = ChatMessageEntity.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role("user")
                .text("Decode the crochet pattern from the uploaded image.")
                .imageData(imageDataUrl)
                .createdAt(LocalDateTime.now())
                .build();
        session.getMessages().add(userMsg);
        chatMessageRepository.save(userMsg);

        // 3. Request analysis from Gemini API
        String decodedText = callGeminiForPatternDecoder(request.imageBase64(), request.imageMime());

        // 4. Save the Model response message
        ChatMessageEntity modelMsg = ChatMessageEntity.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role("model")
                .text(decodedText)
                .createdAt(LocalDateTime.now())
                .build();
        session.getMessages().add(modelMsg);
        chatMessageRepository.save(modelMsg);

        chatSessionRepository.save(session);

        return new PatternDecoderResponse(decodedText);
    }

    private String callGeminiForPatternDecoder(String base64Image, String mimeType) {
        if (geminiApiKey == null || geminiApiKey.equals("mock-or-inactive-key") || geminiApiKey.equals("mock-local-key")
                || geminiApiKey.isBlank()) {
            return simulatePatternDecoderReply();
        }

        try {
            String url = geminiApiUrl + "?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Structure Gemini Request Body
            Map<String, Object> requestBody = new HashMap<>();

            // Build the contents payload
            List<Map<String, Object>> contentsList = new ArrayList<>();
            Map<String, Object> contentMap = new HashMap<>();
            contentMap.put("role", "user");

            List<Map<String, Object>> partsList = new ArrayList<>();

            // Prompt text part
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text",
                    "# Purpose\n" +
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
                            "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.");
            partsList.add(textPart);

            // Image part
            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mimeType", mimeType);
            inlineData.put("data", base64Image);

            Map<String, Object> imagePart = new HashMap<>();
            imagePart.put("inlineData", inlineData);
            partsList.add(imagePart);

            contentMap.put("parts", partsList);
            contentsList.add(contentMap);
            requestBody.put("contents", contentsList);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map responseBody = response.getBody();
                List candidates = (List) responseBody.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map firstCandidate = (Map) candidates.getFirst();
                    Map content = (Map) firstCandidate.get("content");
                    if (content != null) {
                        List parts = (List) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map firstPart = (Map) parts.getFirst();
                            return (String) firstPart.get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            return "Apologies! I encountered an error communicating with Gemini API: " + e.getMessage()
                    + ". Falling back to simulated response:\n\n" + simulatePatternDecoderReply();
        }

        return simulatePatternDecoderReply();
    }

    private String simulatePatternDecoderReply() {
        return "🌸 **AI Pattern Decoder (Simulated Output)**\n\n" +
                "Based on the pattern diagram uploaded, here is the transcription into standard US crochet terminology:\n\n"
                +
                "### **Pattern Details**\n" +
                "- **Skill Level:** Intermediate\n" +
                "- **Pattern Type:** Round/Square Motif (Granny Square style)\n\n" +
                "### **Stitch Key (US Terms)**\n" +
                "- **ch:** Chain stitch\n" +
                "- **sl st:** Slip stitch\n" +
                "- **sc:** Single crochet\n" +
                "- **dc:** Double crochet\n" +
                "- **tr:** Treble crochet\n\n" +
                "### **Step-by-Step Instructions**\n" +
                "1. **Foundation Ring:** Start with a magic ring (or chain 4 and join with a sl st to form a ring).\n" +
                "2. **Round 1:** Chain 3 (counts as first dc). Work 11 dc into the ring. Join with sl st to top of starting ch-3. *(12 stitches)*\n"
                +
                "3. **Round 2:** Chain 4 (counts as dc + ch 1). *dc in next stitch, ch 1; repeat from * around. Join with sl st to 3rd chain of starting ch-4. *(12 dc, 12 ch-spaces)*\n"
                +
                "4. **Round 3:** Slip stitch into the first ch-1 space. Chain 3 (counts as first dc), work 2 dc in same space. *ch 1, skip next dc, 3 dc in next ch-1 space; repeat from * around, ending with ch 1, join with sl st to top of starting ch-3. *(36 dc total, 12 clusters of 3-dc)*\n"
                +
                "5. **Round 4 (Square-off Round):** Slip stitch to the next ch-1 space. Chain 4 (counts as first tr). In the same space, work (2 tr, ch 2, 3 tr) to create the first corner. *[ch 1, skip next cluster, 3 dc in next space, ch 1, skip next cluster, 3 dc in next space, ch 1, corner in next space (3 tr, ch 2, 3 tr)] repeat 3 times. Join with sl st to top of starting ch-4.\n\n"
                +
                "*Tip: Keep your tension even to ensure the square lies flat!*";
    }

    @Transactional
    public PatternDecoderResponse reverseEngineer(String userId, PatternDecoderRequest request) {
        UUID userUuid = UUID.fromString(userId);

        // 1. Create a new Chat Session specifically for this reverse engineering
        // operation
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        ChatSessionEntity session = ChatSessionEntity.builder()
                .chatId(UUID.randomUUID())
                .userId(userUuid)
                .title("AI Reverse Engineer - " + timestamp)
                .messages(new ArrayList<>())
                .build();

        session = chatSessionRepository.save(session);

        // Construct base64 image data URL for database storage
        String imageDataUrl = "data:" + request.imageMime() + ";base64," + request.imageBase64();

        // 2. Save the User query message containing the image
        ChatMessageEntity userMsg = ChatMessageEntity.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role("user")
                .text("Reverse-engineer the crochet pattern from this image of the finished item.")
                .imageData(imageDataUrl)
                .createdAt(LocalDateTime.now())
                .build();
        session.getMessages().add(userMsg);
        chatMessageRepository.save(userMsg);

        // 3. Request analysis from Gemini API
        String decodedText = callGeminiForReverseEngineer(request.imageBase64(), request.imageMime());

        // 4. Save the Model response message
        ChatMessageEntity modelMsg = ChatMessageEntity.builder()
                .messageId(UUID.randomUUID())
                .chatSession(session)
                .chatId(session.getChatId())
                .role("model")
                .text(decodedText)
                .createdAt(LocalDateTime.now())
                .build();
        session.getMessages().add(modelMsg);
        chatMessageRepository.save(modelMsg);

        chatSessionRepository.save(session);

        return new PatternDecoderResponse(decodedText);
    }

    private String callGeminiForReverseEngineer(String base64Image, String mimeType) {
        if (geminiApiKey == null || geminiApiKey.equals("mock-or-inactive-key") || geminiApiKey.equals("mock-local-key")
                || geminiApiKey.isBlank()) {
            return simulateReverseEngineerReply();
        }

        try {
            String url = geminiApiUrl + "?key=" + geminiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Structure Gemini Request Body
            Map<String, Object> requestBody = new HashMap<>();

            // Build the contents payload
            List<Map<String, Object>> contentsList = new ArrayList<>();
            Map<String, Object> contentMap = new HashMap<>();
            contentMap.put("role", "user");

            List<Map<String, Object>> partsList = new ArrayList<>();

            // Prompt text part
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text",
                    "# Purpose\n" +
                            "You are an expert AI Master Crochet Forensic Engineer. Your mission is to analyze photos of *completed* crochet garments, swatches, or objects, and reverse-engineer the structural pattern, stitching types, assembly logic, and material requirements needed to replicate it.\n"
                            +
                            "\n" +
                            "# Core Instructions\n" +
                            "1. Deconstruct the visible stitch architecture from the product photo.\n" +
                            "2. Estimate technical components: yarn weight (e.g., DK, Worsted), likely hook size, assembly orientation (top-down, bottom-up, motifs), and structural join methods.\n"
                            +
                            "\n" +
                            "# Formatting the Output\n" +
                            "Provide your analysis using clean Markdown matching this exact structural schema:\n" +
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
                            "Be encouraging, helpful, and collaborative. Treat the user as a fellow crochet enthusiast.\n"
                            +
                            "");
            partsList.add(textPart);

            // Image part
            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mimeType", mimeType);
            inlineData.put("data", base64Image);

            Map<String, Object> imagePart = new HashMap<>();
            imagePart.put("inlineData", inlineData);
            partsList.add(imagePart);

            contentMap.put("parts", partsList);
            contentsList.add(contentMap);
            requestBody.put("contents", contentsList);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map responseBody = response.getBody();
                List candidates = (List) responseBody.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map firstCandidate = (Map) candidates.getFirst();
                    Map content = (Map) firstCandidate.get("content");
                    if (content != null) {
                        List parts = (List) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map firstPart = (Map) parts.getFirst();
                            return (String) firstPart.get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            return "Apologies! I encountered an error communicating with Gemini API: " + e.getMessage()
                    + ". Falling back to simulated response:\n\n" + simulateReverseEngineerReply();
        }

        return simulateReverseEngineerReply();
    }

    private String simulateReverseEngineerReply() {
        return "🌸 **AI Visual Reverse-Engineer (Simulated Output)**\n\n" +
                "### **Project Overview**\n" +
                "The scanned item appears to be a Classic Crochet Beanie with a ribbed brim.\n\n" +
                "### **Estimated Materials**\n" +
                "- **Suggested Yarn Weight:** Worsted weight yarn (Medium 4)\n" +
                "- **Suggested Hook Size:** 5.0 mm (US H/8) crochet hook\n\n" +
                "### **Stitch Key (US/UK Terms)**\n" +
                "- **ch / ch:** Chain stitch\n" +
                "- **sl st / ss:** Slip stitch\n" +
                "- **sc / dc:** Single crochet (Double crochet in UK terms)\n" +
                "- **hdc / htr:** Half double crochet (Half treble crochet in UK terms)\n" +
                "- **blo / blo:** Back loop only\n\n" +
                "### **Pattern Instructions**\n" +
                "**Brim (Ribbing):**\n" +
                "1. Chain 9.\n" +
                "2. Row 1: sc in second chain from hook and each chain across. ch 1, turn. *(8 stitches)*\n" +
                "3. Row 2: sc in blo of each stitch across. ch 1, turn. *(8 stitches)*\n" +
                "4. Repeat Row 2 until the brim measures approximately 18-20 inches when slightly stretched. Join short ends with slip stitches to form a circle.\n\n"
                +
                "**Hat Body:**\n" +
                "1. Work 60 hdc evenly around the edge of the circular brim. Join with sl st to first hdc.\n" +
                "2. Round 2-12: ch 1, hdc in each stitch around. Join with sl st.\n" +
                "3. Round 13 (Decrease): *hdc in next 4 stitches, hdc2tog; repeat from * around. *(50 stitches)*\n" +
                "4. Round 14 (Decrease): *hdc in next 3 stitches, hdc2tog; repeat from * around. *(40 stitches)*\n" +
                "5. Fasten off leaving a long tail. Weave tail through the final round and pull tight to close the crown.";
    }
}
