import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export const GET = async (context) => {
  const { params } = context;
  const { id } = params;
  try {
    const supabase = createSupabaseServerClient(context);

    // 1. Get playlist details
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single();

    if (playlistError || !playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { status: 404 });
    }

    // 2. Get tracks in this playlist
    const { data: tracksData, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select('added_at, tracks(*, albums(title, artist, cover))')
      .eq('playlist_id', id)
      .order('added_at', { ascending: true });

    // Transform nested structure back to flat structure expected by the UI
    const formattedTracks = (tracksData || []).map(pt => ({
      ...pt.tracks,
      album_title: pt.tracks.albums?.title,
      album_artist: pt.tracks.albums?.artist,
      album_cover: pt.tracks.albums?.cover,
      added_at: pt.added_at
    }));

    return new Response(JSON.stringify({
      ...playlist,
      tracks: formattedTracks
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get Playlist Detail error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const PATCH = async (context) => {
  const { params, request } = context;
  const { id } = params;
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { title, description } = await request.json();
    if (!title) return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });

    const { error } = await supabase
      .from('playlists')
      .update({ title, description: description || '' })
      .match({ id, user_id: user.id });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, title, description }), { status: 200 });
  } catch (error) {
    console.error('Update Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const DELETE = async (context) => {
  const { params } = context;
  const { id } = params;
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { error } = await supabase
      .from('playlists')
      .delete()
      .match({ id, user_id: user.id });
      
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Delete Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
