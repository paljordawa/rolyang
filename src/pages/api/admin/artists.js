import { createSupabaseAdminClient } from "../../../lib/supabaseAdmin";

export const POST = async ({ request }) => {
  const admin = createSupabaseAdminClient();
  const body = await request.json();
  const { name, thumbnail, bio, instagram, facebook, twitter } = body;

  try {
    // Upsert artist profile
    const { error } = await admin
      .from("artists")
      .upsert({
        name,
        thumbnail,
        bio,
        social_instagram: instagram,
        social_facebook: facebook,
        social_twitter: twitter,
        updated_at: new Date().toISOString()
      }, { onConflict: 'name' });

    if (error) {
      console.error("Supabase Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("API Error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
};

export const GET = async () => {
  const admin = createSupabaseAdminClient();
  try {
    const { data, error } = await admin.from("artists").select("*");
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
