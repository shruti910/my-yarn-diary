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
    status VARCHAR(30) NOT NULL,
    row_count INT NOT NULL,
    encrypted_notes BYTEA,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    is_archive BOOLEAN NOT NULL DEFAULT FALSE,
    care_instructions VARCHAR(500),
    total_time VARCHAR(30),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
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
    is_cover BOOLEAN DEFAULT FALSE,
    CONSTRAINT pk_project_photos PRIMARY KEY (id),
    CONSTRAINT fk_project_photos_project FOREIGN KEY (project_pk_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE journal_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    log_id UUID NOT NULL,
    project_pk_id BIGINT NOT NULL,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    encrypted_text_entry BYTEA NOT NULL,
    image_base64 TEXT,
    row_count_snapshot INT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_journal_logs PRIMARY KEY (id),
    CONSTRAINT uq_journal_logs_log_id UNIQUE (log_id),
    CONSTRAINT fk_journal_logs_project FOREIGN KEY (project_pk_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE project_yarns (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_pk_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    brand VARCHAR(255),
    line_name VARCHAR(255),
    colorway VARCHAR(30),
    dye_lot VARCHAR(255),
    yarn_weight VARCHAR(30),
    fiber_content TEXT,
    quantity_used DECIMAL,
    unit VARCHAR(30) NOT NULL DEFAULT 'meters',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_project_yarns PRIMARY KEY (id)
);

CREATE TABLE project_hooks (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_pk_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    size_mm DECIMAL,
    size_us VARCHAR(30),
    material VARCHAR(255),
    brand VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_project_hooks PRIMARY KEY (id)
);

CREATE TABLE project_patterns (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_pk_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL UNIQUE,
    pattern_type VARCHAR(20) NOT NULL,
    pattern_content TEXT NOT NULL,
    file_name VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_project_patterns PRIMARY KEY (id)
);

CREATE INDEX idx_projects_is_favorite ON projects(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_projects_paginated_created_desc ON projects(user_id, is_deleted, is_archive, created_at DESC);
CREATE INDEX idx_projects_paginated_created_asc ON projects(user_id, is_deleted, is_archive, created_at ASC);
CREATE INDEX idx_projects_paginated_updated_desc ON projects(user_id, is_deleted, is_archive, updated_at DESC);
CREATE INDEX idx_projects_paginated_updated_asc ON projects(user_id, is_deleted, is_archive, updated_at ASC);
CREATE INDEX idx_projects_paginated_title_asc ON projects(user_id, is_deleted, is_archive, title ASC);
CREATE INDEX idx_projects_paginated_title_desc ON projects(user_id, is_deleted, is_archive, title DESC);
CREATE INDEX idx_projects_cat_paginated_created_desc ON projects(user_id, category_id, is_deleted, is_archive, created_at DESC);
CREATE INDEX idx_journal_logs_paginated_desc ON journal_logs(user_id, project_id, is_deleted, created_at DESC);
