import { createSupabaseServerClient } from '../../lib/supabaseServer';

export const GET = async (context) => {
  const { url } = context;
  const query = url.searchParams.get('q');
  
  if (!query) {
    return new Response(JSON.stringify({ songs: [], artists: [], albums: [] }), { status: 200 });
  }

  try {
    const supabase = createSupabaseServerClient(context);
    const q = `%${query}%`;
    
    // 1. Fetch matching Songs (Tracks)
    // We use a raw RPC or just nested select if possible. 
    // Since we need trackIndex (complex row number), raw SQL might be easier but Supabase's JS client doesn't do raw SQL well.
    // However, we can use the 'tracks' table and join albums.
    
    const { data: songsData, error: songsError } = await supabase
      .from('tracks')
      .select('*, albums(title, cover, artist)')
      .ilike('title', q)
      .limit(10);

    // To get trackIndex, we'd ideally have it in the DB or calculate it.
    // Since we don't have it indexed, we'll fetch others in the same album to find position or just mock it.
    // For migration purposes, I'll calculate it by fetching the album's tracks.
    const songs = await Promise.all((songsData || []).map(async (song) => {
       const { data: albumTracks } = await supabase
         .from('tracks')
         .select('id')
         .eq('album_id', song.album_id)
         .order('id', { ascending: true });
       
       const index = albumTracks?.findIndex(t => t.id === song.id) || 0;
       
       return {
         ...song,
         albumTitle: song.albums?.title,
         albumCover: song.albums?.cover,
         albumArtist: song.albums?.artist,
         trackIndex: index
       };
    }));

    // 2. Fetch matching Artists (Unique artists from albums)
    const { data: artistsData } = await supabase
      .from('albums')
      .select('artist, cover, id')
      .ilike('artist', q)
      .limit(20);
    
    // Deduplicate artists in JS
    const uniqueArtists = [];
    const seenArtists = new Set();
    (artistsData || []).forEach(a => {
      if (!seenArtists.has(a.artist)) {
        seenArtists.add(a.artist);
        uniqueArtists.push({ artist: a.artist, cover: a.cover, albumId: a.id });
      }
    });

    // 3. Fetch matching Albums
    const { data: albums } = await supabase
      .from('albums')
      .select('*')
      .ilike('title', q)
      .limit(10);

    const playlists = [];
    if (query.toLowerCase().includes('like') || query.toLowerCase().includes('song')) {
      playlists.push({
        id: 'liked-songs',
        title: 'Liked Songs',
        artist: 'Playlist',
        isLikedSongs: true,
        cover: 'gradient'
      });
    }

    const responseData = {
      songs,
      artists: uniqueArtists.slice(0, 5),
      albums: albums || [],
      playlists: playlists
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Database search error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
