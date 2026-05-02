import { createSupabaseServerClient, createAdminClient } from '../../../lib/supabaseServer';

export const GET = async (context) => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('genres').select('*').order('name', { ascending: true });
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { name } = await context.request.json();
    if (!name) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400 });

    const { data, error } = await admin.from('genres').insert([{ name }]).select();
    if (error) throw error;
    return new Response(JSON.stringify(data[0]), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

    const { error } = await admin.from('genres').delete().eq('id', id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
export const PATCH = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { id, name, oldName } = await context.request.json();
    if (!id || !name) return new Response(JSON.stringify({ error: 'ID and Name required' }), { status: 400 });

    // 1. Update the genre name in the genres table
    const { error: gError } = await admin.from('genres').update({ name }).eq('id', id);
    if (gError) throw gError;

    // 2. Sync all tracks using the old name
    if (oldName) {
      const { error: tError } = await admin.from('tracks').update({ genre: name }).eq('genre', oldName);
      if (tError) console.error('Track sync error:', tError);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
