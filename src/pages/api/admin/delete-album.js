import { createSupabaseServerClient, createAdminClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { albumId } = await context.request.json();
    if (!albumId) return new Response(JSON.stringify({ error: 'albumId required' }), { status: 400 });

    // 1. Get Metadata for cleanup
    const { data: album } = await admin.from('albums').select('*').eq('id', albumId).single();
    const { data: tracks } = await admin.from('tracks').select('*').eq('album_id', albumId);

    if (album) {
      // 2. Storage Cleanup
      const filesToDeleteAudio = (tracks || [])
        .map(t => t.audio?.split('/').pop())
        .filter(Boolean)
        .map(f => decodeURIComponent(f));
      
      const fileToDeleteCover = album.cover?.split('/').pop();

      // Delete from 'audio' bucket
      if (filesToDeleteAudio.length > 0) {
        console.log(`[Admin] Deleting ${filesToDeleteAudio.length} tracks from storage for album:`, albumId);
        await admin.storage.from('audio').remove(filesToDeleteAudio);
      }

      // Delete from 'thumbnails' bucket
      if (fileToDeleteCover) {
        console.log(`[Admin] Deleting cover from storage for album:`, albumId);
        await admin.storage.from('thumbnails').remove([decodeURIComponent(fileToDeleteCover)]);
      }
    }

    // 3. Database Cleanup
    // Note: If you ran the Cascade SQL, just deleting the album is enough.
    // But we'll be thorough here.
    if (tracks && tracks.length > 0) {
      const trackIds = tracks.map(t => t.id);
      await admin.from('playlist_tracks').delete().in('track_id', trackIds);
      await admin.from('tracks').delete().eq('album_id', albumId);
    }

    const { error: albumErr } = await admin.from('albums').delete().eq('id', albumId);
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
