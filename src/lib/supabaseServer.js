import { createServerClient, parseCookieHeader } from '@supabase/ssr'

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
