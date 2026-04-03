import { client } from '../../../../lib/db';

export const POST = async ({ request }) => {
  try {
    const { playlistId, trackId } = await request.json();
    if (!playlistId || !trackId) {
      return new Response(JSON.stringify({ error: 'Playlist ID and Track ID are required' }), { status: 400 });
    }

    // Check if relationship already exists
    const check = await client.execute({
      sql: "SELECT 1 FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
      args: [playlistId, trackId]
    });

    if (check.rows.length > 0) {
      return new Response(JSON.stringify({ message: 'Track already in playlist' }), { status: 200 });
    }

    await client.execute({
      sql: "INSERT INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)",
      args: [playlistId, trackId]
    });

    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (error) {
    console.error('Add to Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
