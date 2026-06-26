ALTER TABLE projects DROP COLUMN yarn_brand;
ALTER TABLE projects DROP COLUMN hook_size;
ALTER TABLE projects DROP COLUMN yarn_colorway;
ALTER TABLE projects DROP COLUMN yarn_batch;
ALTER TABLE project_photos ADD COLUMN is_cover BOOLEAN DEFAULT FALSE;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT pk_project_yarns PRIMARY KEY (id)
);

CREATE TABLE project_hooks (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    project_pk_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    size_mm DECIMAL NOT NULL,
    size_us VARCHAR(30),
    material VARCHAR(255),
    brand VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT pk_project_hooks PRIMARY KEY (id)
);

ALTER TABLE projects ADD COLUMN care_instructions VARCHAR(500);
ALTER TABLE projects ADD COLUMN total_time VARCHAR(30);
