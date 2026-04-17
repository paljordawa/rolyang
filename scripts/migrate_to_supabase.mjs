import { createClient } from '@libsql/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const libsqlClient = createClient({
  url: "file:local.db"
});

const supabase = createSupabaseClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for migration bypass RLS
);

async function migrate() {
  try {
    console.log("Starting migration to Supabase...");

    // 1. Fetch from LibSQL
    const albumsRes = await libsqlClient.execute("SELECT * FROM albums");
    const tracksRes = await libsqlClient.execute("SELECT * FROM tracks");

    console.log(`Found ${albumsRes.rows.length} albums and ${tracksRes.rows.length} tracks.`);

    // 2. Upload Albums
    if (albumsRes.rows.length > 0) {
      console.log("Migrating albums...");
      const { error: albumError } = await supabase
        .from('albums')
        .upsert(albumsRes.rows);
      
      if (albumError) throw albumError;
    }

    // 3. Upload Tracks
    if (tracksRes.rows.length > 0) {
      console.log("Migrating tracks...");
      // Sanitize tracks to omit 'liked' and 'added_at' columns which aren't in Supabase tracks table
      const sanitizedTracks = tracksRes.rows.map(track => ({
        id: track.id,
        album_id: track.album_id,
        title: track.title,
        audio: track.audio,
        duration: track.duration,
        play_count: track.play_count || 0
      }));

      const { error: trackError } = await supabase
        .from('tracks')
        .upsert(sanitizedTracks);
      
      if (trackError) throw trackError;
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
