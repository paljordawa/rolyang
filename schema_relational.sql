-- Drop old tables
DROP TABLE IF EXISTS user_playlists CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS artists CASCADE;

CREATE TABLE artists (
  id text PRIMARY KEY,
  name text NOT NULL,
  bio text NOT NULL,
  image_url text NOT NULL,
  followers text NOT NULL
);

CREATE TABLE albums (
  id text PRIMARY KEY,
  title text NOT NULL,
  artist_id text NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  year text,
  cover_url text NOT NULL
);

CREATE TABLE tracks (
  id text PRIMARY KEY,
  title text NOT NULL,
  artist_id text NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  album_id text REFERENCES albums(id) ON DELETE CASCADE,
  duration integer NOT NULL,
  genre text NOT NULL,
  audio_url text NOT NULL,
  color text NOT NULL,
  cover_url text,
  year text,
  lyrics jsonb
);

CREATE TABLE playlists (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  songs text[],
  cover_url text NOT NULL
);

CREATE TABLE user_favorites (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id text REFERENCES tracks(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE user_follows (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id text REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE user_playlists (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  songs text[],
  cover_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlists ENABLE ROW LEVEL SECURITY;

-- Global tables are public read-only
CREATE POLICY "Public artists are viewable by everyone." ON artists FOR SELECT USING (true);
CREATE POLICY "Public albums are viewable by everyone." ON albums FOR SELECT USING (true);
CREATE POLICY "Public tracks are viewable by everyone." ON tracks FOR SELECT USING (true);
CREATE POLICY "Public playlists are viewable by everyone." ON playlists FOR SELECT USING (true);

-- User-specific tables: Users can only see and modify their own data
CREATE POLICY "Users can manage their own favorites" ON user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own follows" ON user_follows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own playlists" ON user_playlists FOR ALL USING (auth.uid() = user_id);
