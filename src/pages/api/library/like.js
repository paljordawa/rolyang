import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  const { request } = context;
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { trackId, liked } = await request.json();

    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId is required' }), { status: 400 });
    }

    if (liked) {
      const { error } = await supabase
        .from('user_likes')
        .upsert({ user_id: user.id, track_id: trackId });
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_likes')
        .delete()
        .match({ user_id: user.id, track_id: trackId });
      
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, liked }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Like API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
