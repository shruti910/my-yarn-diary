CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    category_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT uq_categories_category_id UNIQUE (category_id)
);

CREATE TABLE projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    category_pk_id BIGINT NOT NULL,
    category_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    yarn_brand VARCHAR(100),
    yarn_colorway VARCHAR(100),
    yarn_batch VARCHAR(50),
    hook_size VARCHAR(50),
    status VARCHAR(30) NOT NULL,
    row_count INT NOT NULL,
    notes TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_projects PRIMARY KEY (id),
    CONSTRAINT uq_projects_project_id UNIQUE (project_id),
    CONSTRAINT fk_projects_category FOREIGN KEY (category_pk_id) REFERENCES categories (id) ON DELETE CASCADE
);

CREATE TABLE project_photos (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_pk_id BIGINT NOT NULL,
    photo_base64 TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_project_photos PRIMARY KEY (id),
    CONSTRAINT fk_project_photos_project FOREIGN KEY (project_pk_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE journal_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    log_id UUID NOT NULL,
    project_pk_id BIGINT NOT NULL,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    text_entry TEXT NOT NULL,
    image_base64 TEXT,
    row_count_snapshot INT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_journal_logs PRIMARY KEY (id),
    CONSTRAINT uq_journal_logs_log_id UNIQUE (log_id),
    CONSTRAINT fk_journal_logs_project FOREIGN KEY (project_pk_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_is_favorite ON projects(user_id, is_favorite) WHERE is_favorite = TRUE;
