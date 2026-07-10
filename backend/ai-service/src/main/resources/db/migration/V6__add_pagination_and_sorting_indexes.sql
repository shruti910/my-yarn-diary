-- Composite indexes for chat sessions pagination, category-filtering, and sorting
CREATE INDEX idx_chat_sessions_paginated ON chat_sessions(user_id, is_deleted, is_pinned DESC, created_at DESC);
CREATE INDEX idx_chat_sessions_category_paginated ON chat_sessions(user_id, category, is_deleted, is_pinned DESC, created_at DESC);
