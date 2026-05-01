import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { albumId } = await context.request.json();
    if (!albumId) return new Response(JSON.stringify({ error: 'albumId required' }), { status: 400 });

    // Delete tracks first (foreign key constraint)
    const { error: tracksErr } = await supabase.from('tracks').delete().eq('album_id', albumId);
    if (tracksErr) throw tracksErr;

    // Also remove from any playlist_tracks
    const { data: trackIds } = await supabase.from('tracks').select('id').eq('album_id', albumId);
    if (trackIds && trackIds.length > 0) {
      await supabase.from('playlist_tracks').delete().in('track_id', trackIds.map(t => t.id));
    }

    // Delete album
    const { error: albumErr } = await supabase.from('albums').delete().eq('id', albumId);
    if (albumErr) throw albumErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Admin delete-album error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500 });
  }
};
