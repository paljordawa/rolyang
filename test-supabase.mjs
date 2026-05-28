import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey); // Use ANON key to test RLS!

async function testQuery() {
  console.log("Testing Supabase connection with ANON key...");
  
  const { data: tracks, error: tracksErr } = await supabase.from('tracks').select('*');
  if (tracksErr) console.error("Tracks Error:", tracksErr);
  else console.log(`Found ${tracks?.length || 0} tracks.`);

  const { data: albums, error: albumsErr } = await supabase.from('albums').select('*');
  if (albumsErr) console.error("Albums Error:", albumsErr);
  else console.log(`Found ${albums?.length || 0} albums.`);

  const { data: artists, error: artistsErr } = await supabase.from('artists').select('*');
  if (artistsErr) console.error("Artists Error:", artistsErr);
  else console.log(`Found ${artists?.length || 0} artists.`);
}

testQuery();
