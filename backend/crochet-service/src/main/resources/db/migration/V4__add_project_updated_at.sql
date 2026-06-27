ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP;
UPDATE projects SET updated_at = created_at;
ALTER TABLE projects ALTER COLUMN updated_at SET NOT NULL;
