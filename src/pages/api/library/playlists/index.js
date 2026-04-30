import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export const GET = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
       return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('List Playlists error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};

export const POST = async (context) => {
  const { request } = context;
  try {
    const supabase = createSupabaseServerClient(context);
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { title, description } = await request.json();
    if (!title) return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });

    const cover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=300&h=300';

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        title,
        description: description || '',
        cover
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), { status: 201 });
  } catch (error) {
    console.error('Create Playlist error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
