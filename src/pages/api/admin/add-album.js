import { createSupabaseServerClient, createAdminClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { albumId, title, artist, publishYear, coverUrl, tracks } = await context.request.json();

    // Validate
    if (!albumId || !title || !artist || !coverUrl || !Array.isArray(tracks) || tracks.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Check album ID is unique
    const { data: existing } = await admin.from('albums').select('id').eq('id', albumId).single();
    if (existing) {
      return new Response(JSON.stringify({ error: `Album ID "${albumId}" already exists` }), { status: 409 });
    }

    // Insert album
    const { error: albumErr } = await admin.from('albums').insert({
      id:     albumId,
      title,
      artist,
      publish_year: publishYear,
      cover:  coverUrl,
    });
    if (albumErr) throw albumErr;

    // Insert tracks
    const trackRows = tracks.map((t, i) => ({
      id:        t.id || `${albumId}-t${i + 1}`,
      album_id:  albumId,
      title:     t.title,
      genre:     t.genre || 'General',
      audio:     t.audioUrl,
      play_count: 0,
    }));

    const { error: tracksErr } = await admin.from('tracks').insert(trackRows);
    if (tracksErr) {
      // Rollback album if tracks fail
      await admin.from('albums').delete().eq('id', albumId);
      throw tracksErr;
    }

    return new Response(JSON.stringify({ success: true, albumId, trackCount: trackRows.length }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Admin add-album error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500 });
  }
};
