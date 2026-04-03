import { client } from '../../../lib/db';

export const POST = async ({ request }) => {
  try {
    const { artistName, followed } = await request.json();

    if (!artistName) {
      return new Response(JSON.stringify({ error: 'artistName is required' }), { status: 400 });
    }

    if (followed) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO follows (artist_name, followed_at) VALUES (?, CURRENT_TIMESTAMP)`,
        args: [artistName]
      });
    } else {
      await client.execute({
        sql: `DELETE FROM follows WHERE artist_name = ?`,
        args: [artistName]
      });
    }

    return new Response(JSON.stringify({ success: true, followed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Follow API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
