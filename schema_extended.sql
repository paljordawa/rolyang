-- Global tables
CREATE TABLE IF NOT EXISTS artists (
  id text PRIMARY KEY,
  name text NOT NULL,
  bio text NOT NULL,
  image_url text NOT NULL,
  followers text NOT NULL,
  top_songs text[]
);

CREATE TABLE IF NOT EXISTS playlists (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  songs text[],
  cover_url text NOT NULL
);

-- User-specific tables (Require authentication for write)
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id text REFERENCES tracks(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS user_follows (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id text REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE IF NOT EXISTS user_playlists (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  songs text[],
  cover_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlists ENABLE ROW LEVEL SECURITY;

-- Global tables are public read-only
CREATE POLICY "Public artists are viewable by everyone." ON artists FOR SELECT USING (true);
CREATE POLICY "Public playlists are viewable by everyone." ON playlists FOR SELECT USING (true);

-- User-specific tables: Users can only see and modify their own data
CREATE POLICY "Users can manage their own favorites" ON user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own follows" ON user_follows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own playlists" ON user_playlists FOR ALL USING (auth.uid() = user_id);
