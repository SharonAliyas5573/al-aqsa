// Quick end-to-end check of the login → session → profile flow against the
// live Supabase backend, using the SAME (fixed) pattern as AuthProvider:
// the profile is fetched OUTSIDE the onAuthStateChange callback.
//
// Run:  ALAQSA_PASSWORD='yourpassword' node scripts/test-login.mjs
// (reads URL + anon key from .env)

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const email = process.env.ALAQSA_EMAIL || "admin@alaqsa.com";
const password = process.env.ALAQSA_PASSWORD;
if (!password) {
  console.error("Set ALAQSA_PASSWORD='...' to run this test.");
  process.exit(1);
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

let sessionSeen = false;
supabase.auth.onAuthStateChange((event, session) => {
  // Fixed pattern: ONLY set flags here, no awaited Supabase calls.
  console.log(`[auth event] ${event} — hasSession=${!!session}`);
  if (session) sessionSeen = true;
});

console.log("Signing in as", email, "…");
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error) {
  console.error("❌ signIn failed:", error.message);
  process.exit(1);
}
console.log("✅ signIn OK — user id:", data.user.id);

// Profile fetch OUTSIDE any auth callback (as AuthProvider now does).
const { data: profile, error: pErr } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", data.user.id)
  .single();

if (pErr) console.error("❌ profile query failed:", pErr.message);
else console.log("✅ profile loaded:", profile.role, "-", profile.full_name);

console.log("session propagated via callback:", sessionSeen);
console.log(
  sessionSeen && profile
    ? "\n🎉 Flow works — the app will land on the dashboard."
    : "\n⚠️  Something is still off — see errors above.",
);
process.exit(0);
