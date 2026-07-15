CREATE TYPE chat_role AS ENUM ('user', 'model');

CREATE TABLE chat_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    chat_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'buddy',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    total_tokens_consumed INT DEFAULT 0 NOT NULL,
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
    role chat_role NOT NULL,
    encrypted_text_body BYTEA,
    image_data TEXT,
    provider_name VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    prompt_tokens INT DEFAULT 0 NOT NULL,
    completion_tokens INT DEFAULT 0 NOT NULL,
    metadata JSONB,
    reasoning_tokens INT DEFAULT 0 NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_chat_messages PRIMARY KEY (id),
    CONSTRAINT uq_chat_messages_message_id UNIQUE (message_id),
    CONSTRAINT fk_chat_messages_session FOREIGN KEY (chat_session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
);

CREATE TABLE user_rate_limits (
    user_id UUID NOT NULL,
    daily_token_budget INT DEFAULT 50000 NOT NULL,
    tokens_used_today INT DEFAULT 0 NOT NULL,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_user_rate_limits PRIMARY KEY (user_id)
);

CREATE INDEX idx_chat_sessions_paginated ON chat_sessions(user_id, is_deleted, is_pinned DESC, created_at DESC);
CREATE INDEX idx_chat_sessions_category_paginated ON chat_sessions(user_id, category, is_deleted, is_pinned DESC, created_at DESC);
CREATE INDEX idx_chat_messages_lookup ON chat_messages(chat_id, created_at DESC);
