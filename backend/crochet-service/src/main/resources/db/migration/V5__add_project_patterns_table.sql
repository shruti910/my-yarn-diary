-- Flyway migration to create project_patterns table
CREATE TABLE project_patterns (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_pk_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL UNIQUE,
    pattern_type VARCHAR(20) NOT NULL,
    pattern_content TEXT NOT NULL,
    file_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT pk_project_patterns PRIMARY KEY (id)
);
