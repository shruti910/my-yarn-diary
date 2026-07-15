ALTER TABLE journal_logs DROP COLUMN text_entry;
ALTER TABLE journal_logs ADD COLUMN encrypted_text_entry bytea NOT NULL;

ALTER TABLE projects DROP COLUMN notes;
ALTER TABLE projects ADD COLUMN encrypted_notes bytea NULL;
