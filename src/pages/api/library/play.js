import { client } from '../../../lib/db';

export const POST = async ({ request }) => {
  try {
    const { trackId } = await request.json();

    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId is required' }), { status: 400 });
    }

    await client.execute({
      sql: `UPDATE tracks SET play_count = play_count + 1 WHERE id = ?`,
      args: [trackId]
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Play API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
