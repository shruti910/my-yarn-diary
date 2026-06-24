CREATE TABLE chat_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    chat_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_chat_sessions PRIMARY KEY (id),
    CONSTRAINT uq_chat_sessions_chat_id UNIQUE (chat_id)
);

CREATE TABLE chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    message_id UUID NOT NULL,
    chat_session_id BIGINT NOT NULL,
    chat_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    text_body TEXT NOT NULL,
    image_url VARCHAR(500),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_chat_messages PRIMARY KEY (id),
    CONSTRAINT uq_chat_messages_message_id UNIQUE (message_id),
    CONSTRAINT fk_chat_messages_session FOREIGN KEY (chat_session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
);
