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

    const { userId } = await request.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Delete user from Auth
    const { data, error } = await admin.auth.admin.deleteUser(userId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'User permanently deleted' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
