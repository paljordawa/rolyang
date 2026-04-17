import { createSupabaseServerClient } from '../../lib/supabaseServer';

export const GET = async (context) => {
  const { url, cookies, redirect } = context;
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createSupabaseServerClient(context);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return redirect('/');
    }
  }

  // Return the user to an error page with some instructions
  return redirect('/login?error=Could not authenticate user');
};
