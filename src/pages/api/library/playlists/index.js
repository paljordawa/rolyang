import { client } from '../../../../lib/db';

export const GET = async () => {
  try {
    const res = await client.execute("SELECT * FROM playlists ORDER BY created_at DESC");
    return new Response(JSON.stringify(res.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('List Playlists error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const POST = async ({ request }) => {
  try {
    const { title, description } = await request.json();
    if (!title) return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });

    const id = `playlist-${Math.random().toString(36).substring(2, 11)}`;
    const cover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=300&h=300'; // Default music cover

    await client.execute({
      sql: "INSERT INTO playlists (id, title, description, cover) VALUES (?, ?, ?, ?)",
      args: [id, title, description || '', cover]
    });

    return new Response(JSON.stringify({ id, title, description, cover }), { status: 201 });
  } catch (error) {
    console.error('Create Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
