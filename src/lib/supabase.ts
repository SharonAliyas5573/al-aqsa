import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * A no-op lock that acquires immediately. supabase-js defaults to the browser
 * Web Locks API (`navigator.locks`) to serialise auth operations; in some
 * environments a stale/never-released lock makes `signInWithPassword` hang
 * forever ("Signing…" with a 200 already returned). This single-tab app doesn't
 * need cross-tab auth coordination, so we override the lock with a passthrough.
 */
async function passthroughLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return fn();
}

/**
 * Single shared Supabase client. With placeholder env values the client is
 * still constructed (so the app boots) — network calls simply fail until real
 * project credentials are added to .env.
 */
export const supabase = createClient(
  config.supabaseUrl || "https://placeholder.supabase.co",
  config.supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      lock: passthroughLock,
    },
  },
);
