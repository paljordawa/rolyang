import { client } from '../../../lib/db';

export const POST = async ({ request }) => {
  try {
    const { trackId, liked } = await request.json();

    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId is required' }), { status: 400 });
    }

    const addedAt = liked ? new Date().toISOString() : null;

    await client.execute({
      sql: `UPDATE tracks SET liked = ?, added_at = ? WHERE id = ?`,
      args: [liked ? 1 : 0, addedAt, trackId]
    });

    return new Response(JSON.stringify({ success: true, liked, addedAt }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Like API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
