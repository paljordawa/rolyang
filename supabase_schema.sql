-- 1. Create Tables

-- Albums
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio TEXT NOT NULL,
  duration TEXT,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Likes
CREATE TABLE IF NOT EXISTS user_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, track_id)
);

-- User Follows
CREATE TABLE IF NOT EXISTS user_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, artist_name)
);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist Tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, track_id)
);

-- 2. Configure Row Level Security (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Public tables (Read access for everyone)
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for albums" ON albums FOR SELECT USING (true);
CREATE POLICY "Public read access for tracks" ON tracks FOR SELECT USING (true);

-- User-specific tables (Only owner can manage)
CREATE POLICY "Users can manage their own profiles" ON profiles 
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own likes" ON user_likes 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own follows" ON user_follows 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlists" ON playlists 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlist tracks" ON playlist_tracks 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );
