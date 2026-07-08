ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_cover_photo;
ALTER TABLE projects DROP COLUMN IF EXISTS cover_photo;
