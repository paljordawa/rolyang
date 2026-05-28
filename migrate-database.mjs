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

// 1. Define Data
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

const SONGS = [
  { id: '1', title: 'Midnight City', artistId: 'a1', album: "Hurry Up, We're Dreaming", year: '2011', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 372, genre: 'Electronic', color: '#3b82f6', lyrics: [{ time: 0, text: "Waiting in a car" }] },
  { id: '2', title: 'Starboy', artistId: 'a2', album: 'Starboy', year: '2016', coverUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 425, genre: 'R&B', color: '#ef4444', lyrics: [] },
  { id: '3', title: 'Levitating', artistId: 'a3', album: 'Future Nostalgia', year: '2020', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 388, genre: 'Pop', color: '#a855f7', lyrics: [] },
  { id: '4', title: 'Blinding Lights', artistId: 'a2', album: 'After Hours', year: '2020', coverUrl: 'https://images.unsplash.com/photo-1514525253361-bee8718a340b?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', duration: 310, genre: 'Pop', color: '#f97316', lyrics: [] },
  { id: '5', title: 'Outro', artistId: 'a1', album: "Hurry Up, We're Dreaming", year: '2011', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 247, genre: 'Electronic', color: '#3b82f6', lyrics: [] },
  { id: '6', title: 'Wait', artistId: 'a1', album: "Hurry Up, We're Dreaming", year: '2011', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 343, genre: 'Electronic', color: '#3b82f6', lyrics: [] },
  { id: '7', title: 'Lower Your Eyelids', artistId: 'a1', album: 'Before the Dawn Heals Us', year: '2005', coverUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', duration: 618, genre: 'Shoegaze', color: '#6366f1', lyrics: [] },
  { id: '8', title: 'The Hills', artistId: 'a2', album: 'Beauty Behind the Madness', year: '2015', coverUrl: 'https://images.unsplash.com/photo-1514525253361-bee8718a340b?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', duration: 242, genre: 'R&B', color: '#ef4444', lyrics: [] },
  { id: '9', title: 'Physical', artistId: 'a3', album: 'Future Nostalgia', year: '2020', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', duration: 221, genre: 'Pop', color: '#a855f7', lyrics: [] },
  { id: '10', title: 'New Rules', artistId: 'a3', album: 'Dua Lipa', year: '2017', coverUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000&auto=format&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', duration: 209, genre: 'Pop', color: '#f472b6', lyrics: [] }
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

// 2. Extract unique albums
const albumsMap = new Map();
SONGS.forEach(song => {
  const albumKey = `${song.album}-${song.artistId}`;
  if (!albumsMap.has(albumKey)) {
    albumsMap.set(albumKey, {
      id: `al-${Math.random().toString(36).substr(2, 9)}`, // Generate simple ID
      title: song.album,
      artist_id: song.artistId,
      year: song.year || null,
      cover_url: song.coverUrl
    });
  }
});
const ALBUMS = Array.from(albumsMap.values());

async function migrate() {
  console.log('1. Inserting Artists...');
  const { error: err1 } = await supabase.from('artists').upsert(ARTISTS.map(a => ({
    id: a.id,
    name: a.name,
    bio: a.bio,
    image_url: a.imageUrl,
    followers: a.followers,
    top_songs: a.topSongs
  })));
  if (err1) return console.error('Artists Error:', err1);

  console.log('2. Inserting Albums...');
  const { error: err2 } = await supabase.from('albums').upsert(ALBUMS);
  if (err2) return console.error('Albums Error:', err2);

  console.log('3. Inserting Tracks...');
  const tracksToInsert = SONGS.map(song => {
    const album = albumsMap.get(`${song.album}-${song.artistId}`);
    return {
      id: song.id,
      title: song.title,
      artist_id: song.artistId,
      album_id: album.id, // Linking via Foreign Key!
      duration: song.duration,
      genre: song.genre,
      audio_url: song.audioUrl,
      color: song.color,
      lyrics: song.lyrics.length > 0 ? song.lyrics : null
    };
  });
  
  const { error: err3 } = await supabase.from('tracks').upsert(tracksToInsert);
  if (err3) return console.error('Tracks Error:', err3);

  console.log('4. Inserting Playlists...');
  const { error: err4 } = await supabase.from('playlists').upsert(PLAYLISTS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    songs: p.songs,
    cover_url: p.coverUrl
  })));
  if (err4) return console.error('Playlists Error:', err4);

  console.log('✅ Migration completed perfectly! Artists, Albums, and Tracks are now relationally linked!');
}

migrate();
