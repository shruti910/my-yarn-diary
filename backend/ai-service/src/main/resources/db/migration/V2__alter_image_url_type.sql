-- Alter column type of image_url to allow storing base64 image strings
ALTER TABLE chat_messages ALTER COLUMN image_url TYPE TEXT;
