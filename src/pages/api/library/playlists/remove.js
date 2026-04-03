import { client } from '../../../../lib/db';

export const POST = async ({ request }) => {
  try {
    const { playlistId, trackId } = await request.json();
    if (!playlistId || !trackId) {
      return new Response(JSON.stringify({ error: 'Playlist ID and Track ID are required' }), { status: 400 });
    }

    await client.execute({
      sql: "DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?",
      args: [playlistId, trackId]
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Remove track from playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
