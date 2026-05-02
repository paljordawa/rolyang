import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST({ request }) {
  const { trackId, title, genre, genre2 } = await request.json();
  const supabase = createSupabaseAdminClient();

  if (!trackId || !title) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  const { error } = await supabase
    .from('tracks')
    .update({ title, genre: genre || 'General', genre2: genre2 || null })
    .eq('id', trackId);

  if (error) {
    console.error('Error updating track:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
