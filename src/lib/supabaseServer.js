import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient(context) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          try {
            return parseCookieHeader(context.request.headers.get('Cookie') ?? '')
          } catch (e) {
            return []
          }
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
export function createAdminClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
