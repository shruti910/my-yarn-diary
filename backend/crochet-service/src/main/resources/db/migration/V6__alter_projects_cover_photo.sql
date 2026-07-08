ALTER TABLE projects DROP COLUMN IF EXISTS thumbnail_index;
ALTER TABLE projects ADD COLUMN cover_photo BIGINT;
ALTER TABLE projects ADD CONSTRAINT fk_projects_cover_photo FOREIGN KEY (cover_photo) REFERENCES project_photos(id) ON DELETE SET NULL;
