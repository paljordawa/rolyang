import { createClient } from '@supabase/supabase-js';

// Service-role client — server-side only, never expose to browser
// Requires SUPABASE_SERVICE_ROLE_KEY in .env
export function createSupabaseAdminClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return createClient(url, key, { 
    auth: { autoRefreshToken: false, persistSession: false } 
  });
}
