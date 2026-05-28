import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ARTISTS = [
  {
    id: 'a1',
    name: 'M83',
    bio: 'M83 is the musical project of French musician Anthony Gonzalez. Named after a spiral galaxy, the band is known for its sprawling, cinematic synth-pop sound.',
    imageUrl: 'https://images.unsplash.com/photo-1514328537441-df071536f97f?q=80&w=1000&auto=format&fit=crop',
    followers: '2,450,123',
    topSongs: ['1', '5', '6', '7']
  },
  {
    id: 'a2',
    name: 'The Weeknd',
    bio: 'Abel Makkonen Tesfaye, known professionally as the Weeknd, is a Canadian singer-songwriter and actor. Known for his sonic versatility and dark lyricism.',
    imageUrl: 'https://images.unsplash.com/photo-1520127875760-1e2479e09d1e?q=80&w=1000&auto=format&fit=crop',
    followers: '85,123,456',
    topSongs: ['2', '4', '8']
  },
  {
    id: 'a3',
    name: 'Dua Lipa',
    bio: 'Dua Lipa is an English and Albanian singer and songwriter. She is a multi-Grammy winner known for her disco-influenced pop music.',
    imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000&auto=format&fit=crop',
    followers: '68,432,100',
    topSongs: ['3', '9', '10']
  }
];

const PLAYLISTS = [
  {
    id: 'p1',
    name: 'Top 100 Global',
    description: 'The most played songs in the world this week.',
    songs: ['1', '2', '3', '4'],
    coverUrl: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'p2',
    name: 'Electronic Focus',
    description: 'Deep house and synthwave for your flow state.',
    songs: ['1', '4'],
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop'
  }
];

async function migrate() {
  const artistsToInsert = ARTISTS.map(a => ({
    id: a.id,
    name: a.name,
    bio: a.bio,
    image_url: a.imageUrl,
    followers: a.followers,
    top_songs: a.topSongs
  }));

  const playlistsToInsert = PLAYLISTS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    songs: p.songs,
    cover_url: p.coverUrl
  }));

  console.log(`Inserting ${artistsToInsert.length} artists...`);
  const { error: artistError } = await supabase.from('artists').upsert(artistsToInsert);
  if (artistError) console.error("Error inserting artists:", artistError);

  console.log(`Inserting ${playlistsToInsert.length} playlists...`);
  const { error: playlistError } = await supabase.from('playlists').upsert(playlistsToInsert);
  if (playlistError) console.error("Error inserting playlists:", playlistError);

  if (!artistError && !playlistError) {
    console.log("Successfully migrated artists and playlists!");
  }
}

migrate();
