import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST({ request }) {
  const { albumId, title, genre, audioUrl } = await request.json();
  const supabase = createSupabaseAdminClient();

  if (!albumId || !title || !audioUrl) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  // Generate a unique track ID
  const trackId = `${albumId}-t${Date.now()}`;

  const { error } = await supabase.from('tracks').insert({
    id: trackId,
    album_id: albumId,
    title: title,
    genre: genre || 'General',
    genre2: genre2 || null,
    audio: audioUrl,
    play_count: 0
  });

  if (error) {
    console.error('Error adding track:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, trackId }), { status: 200 });
}
