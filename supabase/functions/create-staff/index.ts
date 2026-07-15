// Supabase Edge Function: create-staff
// Owner-only: creates an auth user AND their profile row (with role) in one
// step, using the service-role key. Called from the app's Staff screen.
//
// Required function secrets (auto-available in Supabase, but set explicitly if
// running locally):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy create-staff
//
// Request body: { username, password, full_name, role, designation, monthly_salary }
// Staff log in with a username; we map it to a hidden internal email
// (<username>@alaqsa.local) so Supabase Auth (which needs an email) is happy.
// Auth: caller must be an authenticated 'owner' (verified via their JWT).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Verify the caller is an authenticated owner.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: caller } = await admin
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();
    if (!caller || caller.role !== "owner" || !caller.active) {
      return json({ error: "Only the owner can add staff" }, 403);
    }

    // 2. Validate input.
    const { username, password, full_name, role, designation, monthly_salary } =
      await req.json();
    if (!username || !password || !role) {
      return json({ error: "username, password and role are required" }, 400);
    }
    if (!["owner", "staff"].includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }
    const uname = String(username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,}$/.test(uname)) {
      return json(
        { error: "Username must be 2+ chars: letters, numbers, . _ -" },
        400,
      );
    }
    const email = `${uname}@alaqsa.local`;

    // 3. Create the auth user (email confirmed so they can log in immediately).
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr) return json({ error: cErr.message }, 400);

    // 4. Create the profile row.
    const { error: pErr } = await admin.from("profiles").insert({
      id: created.user.id,
      full_name: full_name ?? "",
      role,
      username: uname,
      designation: designation ?? null,
      monthly_salary: Number(monthly_salary) || 0,
      active: true,
    });
    if (pErr) {
      // Roll back the auth user if the profile insert failed.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: pErr.message }, 400);
    }

    return json({ ok: true, id: created.user.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
