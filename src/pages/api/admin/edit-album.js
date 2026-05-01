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

    console.log("[Admin API] Checking environment...");
    const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
       console.error("[Admin API] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is undefined in both meta and process!");
    } else {
       console.log("[Admin API] Service role key detected.");
    }

    const { albumId, title, artist, coverUrl } = await context.request.json();
    console.log(`[Admin API] Received update for ${albumId}:`, { title, artist, coverUrl });

    if (!albumId) return new Response(JSON.stringify({ error: 'albumId required' }), { status: 400 });

    const updates = {};
    if (title)    updates.title  = title;
    if (artist)   updates.artist = artist;

    if (coverUrl) {
      // 1. Get the old cover to delete it
      const { data: oldAlbum } = await supabase.from('albums').select('cover').eq('id', albumId).single();
      console.log(`[Admin API] Found old cover: ${oldAlbum?.cover}`);

      if (oldAlbum?.cover && oldAlbum.cover.includes('/thumbnails/')) {
        try {
          const oldPath = oldAlbum.cover.split('/thumbnails/').pop().split('?')[0];
          console.log(`[Admin API] Attempting to delete old file: ${decodeURIComponent(oldPath)}`);
          await admin.storage.from('thumbnails').remove([decodeURIComponent(oldPath)]);
        } catch (e) {
          console.warn("[Admin API] Failed to delete old file (might not exist):", e.message);
        }
      }
      updates.cover = coverUrl;
    }

    const cleanId = albumId.trim();
    console.log(`[Admin API] Diagnostic Start for ID: "${cleanId}"`);
    
    // 1. Can we READ it?
    const { data: readCheck } = await supabase.from('albums').select('*').eq('id', cleanId);
    console.log("[Admin API] Read check:", readCheck?.length > 0 ? "Found" : "NOT FOUND");

    // 2. BLIND UPDATE (No .select() at the end)
    console.log("[Admin API] Attempting blind update...");
    const { error: blindErr, status, statusText } = await supabase.from('albums')
      .update(updates)
      .eq('id', cleanId);
    
    console.log("[Admin API] Blind result status:", status, statusText);

    if (blindErr) {
       console.error("[Admin API] Blind update error:", blindErr);
       return new Response(JSON.stringify({ error: blindErr.message }), { status: 500 });
    }

    // Since we didn't use .select(), we check if the status is 204 (No Content) or 200
    // In Supabase, a successful update without .select() usually returns 204.
    if (status === 204 || status === 200) {
       console.log("[Admin API] Blind update appears successful!");
       return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ 
      error: `Update returned status ${status}. Row visible: ${readCheck?.length > 0}`
    }), { status: 404 });
  } catch (err) {
    console.error("[Admin API] Error updating album:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
