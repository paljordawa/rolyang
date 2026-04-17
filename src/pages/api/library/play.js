import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  const { request } = context;
  try {
    const supabase = createSupabaseServerClient(context);

    // Get trackId from body
    const { trackId } = await request.json();

    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId is required' }), { status: 400 });
    }

    // Since REST APIs don't have atomic increment built-in without RPC, we read then update.
    const { data: track } = await supabase
      .from('tracks')
      .select('play_count')
      .eq('id', trackId)
      .single();

    if (track) {
      await supabase
        .from('tracks')
        .update({ play_count: (track.play_count || 0) + 1 })
        .eq('id', trackId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Play API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
