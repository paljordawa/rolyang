import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const GET = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ likedTracks: {}, followedArtists: {}, playlists: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch liked tracks
    const { data: likedRows } = await supabase
      .from('user_likes')
      .select('track_id, tracks(album_id)')
      .eq('user_id', user.id);

    const likedTracks = {};
    (likedRows || []).forEach(row => {
      if (row.tracks) {
        likedTracks[`${row.tracks.album_id}:${row.track_id}`] = true;
      }
    });

    // 2. Fetch followed artists
    const { data: followRows } = await supabase
      .from('user_follows')
      .select('artist_name')
      .eq('user_id', user.id);

    const followedArtists = {};
    (followRows || []).forEach(row => {
      followedArtists[row.artist_name] = true;
    });

    // 3. Fetch user playlists
    const { data: playlistsRows } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return new Response(JSON.stringify({
      likedTracks,
      followedArtists,
      playlists: playlistsRows || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Sync API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
