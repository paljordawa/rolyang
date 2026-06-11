import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDatabase() {
  console.log('⚠️  Starting database wipe...');

  // Deleting artists will cascade and delete all associated albums and tracks
  console.log('1. Deleting all artists (and cascading to albums and tracks)...');
  const { error: err1 } = await supabase.from('artists').delete().neq('id', 'dummy_id');
  if (err1) return console.error('❌ Artists Deletion Error:', err1.message);

  console.log('2. Deleting all playlists...');
  const { error: err2 } = await supabase.from('playlists').delete().neq('id', 'dummy_id');
  if (err2) return console.error('❌ Playlists Deletion Error:', err2.message);

  console.log('✅ Database successfully cleared! All songs, albums, artists, and playlists have been removed.');
}

clearDatabase();
