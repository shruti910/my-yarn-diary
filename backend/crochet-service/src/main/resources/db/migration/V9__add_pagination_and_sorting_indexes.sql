-- Composite indexes for projects pagination, sorting, and user-filtering
CREATE INDEX idx_projects_paginated_created_desc ON projects(user_id, is_deleted, is_archive, created_at DESC);
CREATE INDEX idx_projects_paginated_created_asc ON projects(user_id, is_deleted, is_archive, created_at ASC);
CREATE INDEX idx_projects_paginated_updated_desc ON projects(user_id, is_deleted, is_archive, updated_at DESC);
CREATE INDEX idx_projects_paginated_updated_asc ON projects(user_id, is_deleted, is_archive, updated_at ASC);
CREATE INDEX idx_projects_paginated_title_asc ON projects(user_id, is_deleted, is_archive, title ASC);
CREATE INDEX idx_projects_paginated_title_desc ON projects(user_id, is_deleted, is_archive, title DESC);

CREATE INDEX idx_projects_cat_paginated_created_desc ON projects(user_id, category_id, is_deleted, is_archive, created_at DESC);

-- Composite index for journal logs pagination
CREATE INDEX idx_journal_logs_paginated_desc ON journal_logs(user_id, project_id, is_deleted, created_at DESC);
