CREATE TYPE chat_role AS ENUM ('user', 'model');

ALTER TABLE chat_sessions ADD COLUMN total_tokens_consumed int4 DEFAULT 0 NOT NULL;

ALTER TABLE chat_messages DROP COLUMN text_body;
ALTER TABLE chat_messages ADD COLUMN encrypted_text_body bytea NOT NULL;
ALTER TABLE chat_messages ALTER COLUMN role TYPE chat_role USING (role::chat_role);
ALTER TABLE chat_messages ADD COLUMN provider_name varchar(50) NOT NULL;
ALTER TABLE chat_messages ADD COLUMN model_name varchar(100) NOT NULL;
ALTER TABLE chat_messages ADD COLUMN prompt_tokens int4 DEFAULT 0 NOT NULL;
ALTER TABLE chat_messages ADD COLUMN completion_tokens int4 DEFAULT 0 NOT NULL;
ALTER TABLE chat_messages ADD COLUMN metadata jsonb NULL;

CREATE INDEX idx_chat_messages_lookup ON chat_messages (chat_id, created_at DESC);

CREATE TABLE user_rate_limits (
    user_id uuid NOT NULL,
    daily_token_budget int4 DEFAULT 50000 NOT NULL,
    tokens_used_today int4 DEFAULT 0 NOT NULL,
    last_request_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_user_rate_limits PRIMARY KEY (user_id)
);
