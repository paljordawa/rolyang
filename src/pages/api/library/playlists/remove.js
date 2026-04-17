import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export const POST = async (context) => {
  const { request } = context;
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { playlistId, trackId } = await request.json();
    if (!playlistId || !trackId) {
      return new Response(JSON.stringify({ error: 'Playlist ID and Track ID are required' }), { status: 400 });
    }

    // Verify playlist belongs to user
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('user_id', user.id)
      .single();

    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found or unauthorized' }), { status: 403 });
    }

    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .match({ playlist_id: playlistId, track_id: trackId });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Remove track from playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
