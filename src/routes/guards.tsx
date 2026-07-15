import { Navigate, useLocation } from "react-router-dom";
import { useAuth, useRole } from "@/features/auth/AuthProvider";
import type { Role } from "@/lib/database.types";

/** Full-page spinner while auth state resolves. */
function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

/** Requires an authenticated session; redirects to /login otherwise. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, profileLoading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!session)
    return <Navigate to="/login" state={{ from: location }} replace />;

  // Session exists but profile hasn't resolved yet — wait rather than flashing
  // the "no profile" screen.
  if (profileLoading) return <Loading />;

  if (session && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold">No staff profile found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This account is signed in but has no assigned role. Ask the shop owner
          to add you from the Staff screen.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

/** Restricts a route to specific roles; redirects to dashboard if not allowed. */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const { can } = useRole();
  if (!can(roles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
