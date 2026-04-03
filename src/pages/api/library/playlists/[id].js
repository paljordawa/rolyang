import { client } from '../../../../lib/db';

export const GET = async ({ params }) => {
  const { id } = params;
  try {
    // 1. Get playlist details
    const playlistRes = await client.execute({
      sql: "SELECT * FROM playlists WHERE id = ?",
      args: [id]
    });

    if (playlistRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { status: 404 });
    }

    // 2. Get tracks in this playlist
    // We need to join with tracks AND albums to get the cover/artist info
    const tracksRes = await client.execute({
      sql: `
        SELECT t.*, a.title as album_title, a.artist as album_artist, a.cover as album_cover, pt.added_at
        FROM playlist_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        JOIN albums a ON t.album_id = a.id
        WHERE pt.playlist_id = ?
        ORDER BY pt.added_at ASC
      `,
      args: [id]
    });

    return new Response(JSON.stringify({
      ...playlistRes.rows[0],
      tracks: tracksRes.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get Playlist Detail error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const PATCH = async ({ params, request }) => {
  const { id } = params;
  try {
    const { title, description } = await request.json();
    if (!title) return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });

    await client.execute({
      sql: "UPDATE playlists SET title = ?, description = ? WHERE id = ?",
      args: [title, description || '', id]
    });

    return new Response(JSON.stringify({ success: true, title, description }), { status: 200 });
  } catch (error) {
    console.error('Update Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const DELETE = async ({ params }) => {
  const { id } = params;
  try {
    await client.execute({
      sql: "DELETE FROM playlists WHERE id = ?",
      args: [id]
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Delete Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};


