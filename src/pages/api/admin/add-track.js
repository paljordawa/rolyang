import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { albumId, trackId, title, audioUrl } = await context.request.json();
    if (!albumId || !trackId || !title || !audioUrl) {
      return new Response(JSON.stringify({ error: 'albumId, trackId, title, audioUrl all required' }), { status: 400 });
    }

    const { error } = await supabase.from('tracks').insert({
      id:        trackId,
      album_id:  albumId,
      title,
      audio:     audioUrl,
      play_count: 0,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
