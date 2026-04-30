import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  const { request } = context;
  try {
    const supabase = createSupabaseServerClient(context);
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { artistName, followed } = await request.json();

    if (!artistName) {
      return new Response(JSON.stringify({ error: 'artistName is required' }), { status: 400 });
    }

    if (followed) {
      const { error } = await supabase
        .from('user_follows')
        .upsert({ user_id: user.id, artist_name: artistName });
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .match({ user_id: user.id, artist_name: artistName });
      
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, followed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Follow API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
