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

/** True when the app is pointed at a real Supabase project (not placeholders). */
export const hasSupabaseConfig =
  !!config.supabaseUrl &&
  !config.supabaseUrl.includes("placeholder") &&
  !!config.supabaseAnonKey &&
  !config.supabaseAnonKey.includes("placeholder");
