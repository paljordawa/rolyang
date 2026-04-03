import { client } from '../../lib/db';

export const GET = async ({ url }) => {
  const query = url.searchParams.get('q');
  
  if (!query) {
    return new Response(JSON.stringify({ songs: [], artists: [], albums: [] }), { status: 200 });
  }

  try {
    const q = `%${query}%`;
    
    // 1. Fetch matching Songs (Tracks)
    // We calculate the track index (0-based) within its album using a subquery or Window function if supported, 
    // but for simplicity in SQLite 3.25+, we can use ROW_NUMBER(). 
    // Since we want index, we'll do ROW_NUMBER() - 1.
    const songsResult = await client.execute({
      sql: `
        SELECT * FROM (
          SELECT t.*, a.title as albumTitle, a.cover as albumCover, a.artist as albumArtist,
          (ROW_NUMBER() OVER (PARTITION BY t.album_id ORDER BY t.id) - 1) as trackIndex
          FROM tracks t 
          JOIN albums a ON t.album_id = a.id
        ) WHERE title LIKE ? 
        LIMIT 10
      `,
      args: [q]
    });

    // 2. Fetch matching Artists (Unique artists from albums)
    const artistsResult = await client.execute({
      sql: `
        SELECT DISTINCT artist, MIN(cover) as cover, id as albumId 
        FROM albums 
        WHERE artist LIKE ? 
        GROUP BY artist 
        LIMIT 5
      `,
      args: [q]
    });

    // 3. Fetch matching Albums
    const albumsResult = await client.execute({
      sql: `
        SELECT * FROM albums 
        WHERE title LIKE ? 
        LIMIT 10
      `,
      args: [q]
    });

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
      songs: songsResult.rows,
      artists: artistsResult.rows,
      albums: albumsResult.rows,
      playlists: playlists
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Database search error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
