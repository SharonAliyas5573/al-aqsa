import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { hasSupabaseConfig, usernameToEmail } from "@/lib/config";
import { canSetStage, type Profile, type Role } from "@/lib/database.types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  configured: boolean;
  /** Accepts a username (mapped to a hidden internal email) or a raw email. */
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function loadProfile(userId: string) {
    setProfileLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile((data as Profile) ?? null);
    setProfileLoading(false);
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    // IMPORTANT: never `await` another Supabase call *inside* the
    // onAuthStateChange callback — supabase-js holds an internal lock while the
    // callback runs, so a query there (e.g. loading the profile) can deadlock
    // and the session never propagates. We only touch React state inside the
    // callback and defer the profile fetch to a separate effect (below).
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!newSession) setProfile(null);
        setLoading(false);
      },
    );

    // Prime the initial session (also outside any auth callback).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the profile whenever the signed-in user changes — kept OUT of the auth
  // callback to avoid the lock/deadlock described above.
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) {
      setProfileLoading(true); // mark loading synchronously to avoid a flash
      loadProfile(userId);
    } else {
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value: AuthState = {
    session,
    profile,
    loading,
    profileLoading,
    configured: hasSupabaseConfig,
    async signIn(usernameOrEmail, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(usernameOrEmail),
        password,
      });
      return { error: error?.message };
    },
    async signOut() {
      await supabase.auth.signOut();
      setProfile(null);
    },
    async refreshProfile() {
      if (session) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Role helpers. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRole() {
  const { profile } = useAuth();
  const role = profile?.role;
  return {
    role,
    isOwner: role === "owner",
    isStaff: role === "staff",
    can: (roles: Role[]) => !!role && roles.includes(role),
    /** Mirrors the DB check — see public.can_set_stage(). */
    canSetStage: (stage: number) => canSetStage(profile, stage),
  };
}
