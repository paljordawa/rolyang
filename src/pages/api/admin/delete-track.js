import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { trackId } = await context.request.json();
    if (!trackId) return new Response(JSON.stringify({ error: 'trackId required' }), { status: 400 });

    // Remove from playlist_tracks first
    await supabase.from('playlist_tracks').delete().eq('track_id', trackId);
    // Remove likes
    await supabase.from('liked_tracks').delete().eq('track_id', trackId);
    // Delete track
    const { error } = await supabase.from('tracks').delete().eq('id', trackId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
