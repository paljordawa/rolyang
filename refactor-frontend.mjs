import fs from 'fs';
import path from 'path';

const appPath = path.join(process.cwd(), 'src', 'App.tsx');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Remove constants import
code = code.replace(/import\s+\{\s*PLAYLISTS\s*,\s*ARTISTS\s*\}\s+from\s+'\.\/constants';?\n?/, '');

// 2. Add Album to types import
code = code.replace(/import\s+\{([^}]*)Song([^}]*)\}\s+from\s+'\.\/types';/, (match, p1, p2) => {
  if (!match.includes('Album')) {
    return `import {${p1}Song, Album${p2}} from './types';`;
  }
  return match;
});

// 3. Replace state declarations
const oldStateBlock = `  const [tracks, setTracks] = useState<Song[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);`;

const newStateBlock = `  const [tracks, setTracks] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);`;

code = code.replace(oldStateBlock, newStateBlock);

// 4. Replace useEffect
const oldUseEffectRegex = /useEffect\(\(\) => \{\s*const fetchTracks = async \(\) => \{[\s\S]*?fetchTracks\(\);\s*\}, \[\]\);/;

const newUseEffect = `useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingTracks(true);
        
        const [artistsRes, albumsRes, tracksRes, playlistsRes] = await Promise.all([
          supabase.from('artists').select('*'),
          supabase.from('albums').select('*'),
          supabase.from('tracks').select('*'),
          supabase.from('playlists').select('*')
        ]);

        if (artistsRes.error) throw artistsRes.error;
        if (albumsRes.error) throw albumsRes.error;
        if (tracksRes.error) throw tracksRes.error;
        if (playlistsRes.error) throw playlistsRes.error;

        const fetchedArtists: Artist[] = artistsRes.data.map(a => ({
          id: a.id,
          name: a.name,
          bio: a.bio,
          imageUrl: a.image_url,
          followers: a.followers,
          topSongs: a.top_songs || []
        }));

        const fetchedAlbums: Album[] = albumsRes.data.map(al => ({
          id: al.id,
          title: al.title,
          artistId: al.artist_id,
          year: al.year,
          coverUrl: al.cover_url
        }));

        const fetchedPlaylists: Playlist[] = playlistsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          songs: p.songs || [],
          coverUrl: p.cover_url
        }));

        // Reconstruct full Song objects for the UI
        const fetchedTracks: Song[] = tracksRes.data.map(track => {
          const album = fetchedAlbums.find(al => al.id === track.album_id);
          const artist = fetchedArtists.find(a => a.id === track.artist_id);
          
          return {
            id: track.id,
            title: track.title,
            artistId: track.artist_id,
            albumId: track.album_id,
            artist: artist?.name || 'Unknown Artist',
            album: album?.title || 'Unknown Album',
            coverUrl: album?.coverUrl || '',
            year: album?.year || '',
            audioUrl: track.audio_url,
            duration: track.duration,
            genre: track.genre,
            color: track.color,
            lyrics: track.lyrics || []
          };
        });

        setArtists(fetchedArtists);
        setAlbums(fetchedAlbums);
        setPlaylists(fetchedPlaylists);
        setTracks(fetchedTracks);
        
      } catch (err) {
        console.error("Error fetching data from Supabase:", err);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchData();
  }, []);`;

code = code.replace(oldUseEffectRegex, newUseEffect);

// 5. Global replacements of ARTISTS and PLAYLISTS
// Using regex word boundaries to avoid replacing parts of other words
code = code.replace(/\bARTISTS\b/g, 'artists');
code = code.replace(/\bPLAYLISTS\b/g, 'playlists');

fs.writeFileSync(appPath, code, 'utf8');
console.log('App.tsx refactored successfully.');

// 6. Empty out constants.ts
const constantsPath = path.join(process.cwd(), 'src', 'constants.ts');
fs.writeFileSync(constantsPath, 'export {};\n', 'utf8');
console.log('constants.ts emptied.');
