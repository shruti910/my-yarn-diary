package com.crochet.ai.aiservice.entity;

import com.crochet.ai.aiservice.util.ChatTextEncryptorConverter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
@SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "message_id", nullable = false, unique = true)
    private UUID messageId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "chat_session_id", nullable = false)
    @JsonIgnore
    private ChatSession chatSession;

    @Column(name = "chat_id", nullable = false)
    private UUID chatId;

    @NotNull(message = "Message sender role is required")
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "role", nullable = false)
    private ChatRole role;

    @Convert(converter = ChatTextEncryptorConverter.class)
    @Column(name = "encrypted_text_body", nullable = true)
    private String textBody;

    @Column(name = "image_data", columnDefinition = "TEXT")
    private String imageData;

    @NotBlank(message = "Provider name is required")
    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @NotBlank(message = "Model name is required")
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "prompt_tokens", nullable = false)
    private int promptTokens;

    @Column(name = "completion_tokens", nullable = false)
    private int completionTokens;

    @Column(name = "reasoning_tokens", nullable = false)
    private int reasoningTokens;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
