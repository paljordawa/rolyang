import { client } from '../../../lib/db';

export const GET = async () => {
  try {
    // 1. Fetch liked tracks
    const likedTracksResult = await client.execute(`
      SELECT id, album_id FROM tracks WHERE liked = 1
    `);

    const likedTracks = {};
    likedTracksResult.rows.forEach(row => {
      // Map it back to the same composite key format the UI uses: "album_id:chap_id"
      likedTracks[`${row.album_id}:${row.id}`] = true;
    });

    // 2. Fetch followed artists
    const followsResult = await client.execute(`
      SELECT artist_name FROM follows
    `);

    const followedArtists = {};
    followsResult.rows.forEach(row => {
      followedArtists[row.artist_name] = true;
    });

    // 3. Fetch user playlists
    const playlistsResult = await client.execute(`
      SELECT * FROM playlists ORDER BY created_at DESC
    `);

    return new Response(JSON.stringify({
      likedTracks,
      followedArtists,
      playlists: playlistsResult.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Sync API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
