import { createSupabaseServerClient } from '../../../lib/supabaseServer';
import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export const POST = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient({ request, cookies });
    const { data: { session } } = await supabase.auth.getSession();
    const ADMIN_EMAIL = 'paljordawa@gmail.com';

    // Verify Admin
    if (!session || session.user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { userId, isBanned } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    
    // Calculate ban duration. If unbanning, set to 'none'. If banning, set to 10 years (87600h).
    const banDuration = isBanned ? 'none' : '87600h';

    const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: banDuration });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: isBanned ? 'User unbanned' : 'User banned' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
