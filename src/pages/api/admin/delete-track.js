import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST({ request }) {
  const { trackId, audioUrl } = await request.json();
  const supabase = createSupabaseAdminClient();

  if (!trackId) {
    return new Response(JSON.stringify({ error: 'Missing trackId' }), { status: 400 });
  }

  // 1. Delete from Storage if audioUrl is provided
  if (audioUrl) {
    try {
      // Extract filename from URL: .../public/audio/filename.mp3
      const parts = audioUrl.split('/');
      const filename = decodeURIComponent(parts[parts.length - 1]);
      
      console.log(`Deleting storage file: ${filename}`);
      const { error: storageError } = await supabase.storage
        .from('audio')
        .remove([filename]);
        
      if (storageError) {
        console.warn('Storage deletion warning:', storageError.message);
      }
    } catch (e) {
      console.warn('Could not parse audio URL for storage deletion:', e.message);
    }
  }

  // 2. Delete from Database
  const { error } = await supabase
    .from('tracks')
    .delete()
    .eq('id', trackId);

  if (error) {
    console.error('Error deleting track:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
