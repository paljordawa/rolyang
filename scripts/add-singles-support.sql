-- 1. Make album_id nullable on tracks table so singles don't require an album
ALTER TABLE tracks ALTER COLUMN album_id DROP NOT NULL;

-- 2. Add cover_url column to tracks table to store cover art for individual singles
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS cover_url text;

-- 3. Add year column to tracks table to store release year for individual singles
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS year text;
