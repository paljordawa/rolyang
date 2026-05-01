import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const POST = async (context) => {
  try {
    const supabase = createSupabaseServerClient(context);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'paljordawa@gmail.com') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { trackId, title } = await context.request.json();
    if (!trackId || !title) return new Response(JSON.stringify({ error: 'trackId and title required' }), { status: 400 });

    const { error } = await supabase.from('tracks').update({ title }).eq('id', trackId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
