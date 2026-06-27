-- V2: Alter users table to remove phone_number, rename avatar_url, and change profile_picture to TEXT to support base64
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;

-- Rename avatar_url to profile_picture if it exists
ALTER TABLE users RENAME COLUMN avatar_url TO profile_picture;
-- Alter column profile_picture to TEXT to support long base64 strings

ALTER TABLE users ALTER COLUMN profile_picture TYPE TEXT;
