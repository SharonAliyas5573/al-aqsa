/** Runtime configuration sourced from Vite env vars. */

export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  whatsappMode: (import.meta.env.VITE_WHATSAPP_MODE ?? "mock") as
    | "mock"
    | "live",
  shop: {
    name: (import.meta.env.VITE_SHOP_NAME ?? "Al Aqsa Tailor Shop") as string,
    phone: (import.meta.env.VITE_SHOP_PHONE ?? "") as string,
    address: (import.meta.env.VITE_SHOP_ADDRESS ?? "") as string,
  },
};

/**
 * Staff log in with a username, not an email. Supabase Auth needs an email, so
 * a username `ravi` maps to the hidden internal address `ravi@alaqsa.local`.
 * If the entered value already looks like an email (contains "@") it is used
 * as-is — this keeps the original email-based owner account working too.
 */
export const USERNAME_EMAIL_DOMAIN = "alaqsa.local";

export function usernameToEmail(input: string): string {
  const v = input.trim();
  return v.includes("@") ? v : `${v.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}

/** True when the app is pointed at a real Supabase project (not placeholders). */
export const hasSupabaseConfig =
  !!config.supabaseUrl &&
  !config.supabaseUrl.includes("placeholder") &&
  !!config.supabaseAnonKey &&
  !config.supabaseAnonKey.includes("placeholder");
