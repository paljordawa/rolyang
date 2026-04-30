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
    
    // Parallelize the three main searches
    const [ { data: songsData, error: songsError }, { data: artistsData }, { data: albumsData } ] = await Promise.all([
      supabase.from('tracks').select('*, albums(title, cover, artist)').ilike('title', q).limit(10),
      supabase.from('albums').select('artist, cover, id').ilike('artist', q).limit(20),
      supabase.from('albums').select('*').ilike('title', q).limit(10)
    ]);

    if (songsError) throw songsError;

    // Batch process track indices to avoid N+1 queries
    const albumIds = [...new Set((songsData || []).map(s => s.album_id))];
    let albumTracksMap = {};

    if (albumIds.length > 0) {
      const { data: allAlbumTracks } = await supabase
        .from('tracks')
        .select('id, album_id')
        .in('album_id', albumIds)
        .order('id', { ascending: true });

      (allAlbumTracks || []).forEach(t => {
        if (!albumTracksMap[t.album_id]) albumTracksMap[t.album_id] = [];
        albumTracksMap[t.album_id].push(t.id);
      });
    }

    const songs = (songsData || []).map(song => ({
      ...song,
      albumTitle: song.albums?.title,
      albumCover: song.albums?.cover,
      albumArtist: song.albums?.artist,
      trackIndex: (albumTracksMap[song.album_id] || []).indexOf(song.id) || 0
    }));

    // Deduplicate artists
    const uniqueArtists = [];
    const seenArtists = new Set();
    (artistsData || []).forEach(a => {
      if (!seenArtists.has(a.artist)) {
        seenArtists.add(a.artist);
        uniqueArtists.push({ artist: a.artist, cover: a.cover, albumId: a.id });
      }
    });

    const playlists = [];
    if (query.toLowerCase().includes('like') || query.toLowerCase().includes('song')) {
      playlists.push({ id: 'liked-songs', title: 'Liked Songs', artist: 'Playlist', isLikedSongs: true, cover: 'gradient' });
    }

    const responseData = {
      songs,
      artists: uniqueArtists.slice(0, 5),
      albums: albumsData || [],
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
