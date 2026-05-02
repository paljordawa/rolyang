import { createSupabaseServerClient } from '../../../lib/supabaseServer';
import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const admin = createSupabaseAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.email !== 'paljordawa@gmail.com') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { albumId, title, artist, genre, publishYear, coverUrl } = await context.request.json();
    
    if (!albumId) return new Response(JSON.stringify({ error: 'albumId required' }), { status: 400 });
    const cleanId = albumId.trim();

    const updates = {};
    if (title)    updates.title  = title;
    if (artist)   updates.artist = artist;
    if (genre !== undefined) updates.genre = genre;
    if (publishYear !== undefined) updates.publish_year = publishYear;

    if (coverUrl) {
      // 1. Get the old cover to delete it (Using admin client to ensure we can read it)
      const { data: oldAlbum } = await admin.from('albums').select('cover').eq('id', cleanId).single();
      
      if (oldAlbum?.cover && oldAlbum.cover.includes('/thumbnails/')) {
        try {
          const oldPath = oldAlbum.cover.split('/thumbnails/').pop().split('?')[0];
          const decodedPath = decodeURIComponent(oldPath);
          console.log(`[Admin API] Cleaning up storage. Deleting: ${decodedPath}`);
          
          const { error: delErr } = await admin.storage.from('thumbnails').remove([decodedPath]);
          if (delErr) console.error("[Admin API] Storage cleanup failed:", delErr.message);
          else console.log("[Admin API] Storage cleanup successful.");
        } catch (e) {
          console.warn("[Admin API] Storage cleanup error:", e.message);
        }
      }
      updates.cover = coverUrl;
    }

    // 2. UPDATE (Use admin client and .select() to verify success)
    console.log("[Admin API] Attempting update via admin client for:", cleanId);
    const { data: updatedRows, error: updateErr } = await admin.from('albums')
      .update(updates)
      .eq('id', cleanId)
      .select();

    if (updateErr) {
       console.error("[Admin API] Update error:", updateErr);
       return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
    }

    // 3. Handle NEW TRACKS if provided
    const { newTracks } = await context.request.json();
    if (Array.isArray(newTracks) && newTracks.length > 0) {
      console.log(`[Admin API] Inserting ${newTracks.length} new tracks for album:`, cleanId);
      const trackRows = newTracks.map((t, i) => ({
        id: `${cleanId}-t${Date.now()}-${i}`,
        album_id: cleanId,
        title: t.title,
        genre: t.genre || 'General',
        audio: t.audioUrl,
        play_count: 0
      }));
      
      const { error: trackErr } = await admin.from('tracks').insert(trackRows);
      if (trackErr) {
        console.error("[Admin API] Bulk track insert error:", trackErr);
      }
    }

    if (updatedRows && updatedRows.length > 0) {
       return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ 
      error: `No album found with ID: ${cleanId}`
    }), { status: 404 });
  } catch (err) {
    console.error("[Admin API] Error updating album:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
