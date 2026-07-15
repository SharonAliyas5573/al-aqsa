import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Scissors } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { config } from "@/lib/config";

export function LoginPage() {
  const { signIn, configured, session } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Once a session exists (fresh sign-in or already logged in), leave the
  // login page — back to where RequireAuth bounced us from, or the dashboard.
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";
  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setBusy(false);
    }
    // On success we stay "busy" until the session state triggers the redirect
    // above — resetting here would flash an enabled "Sign In" button.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Scissors className="size-8" />
            </div>
            <h1 className="text-2xl font-bold">{config.shop.name}</h1>
            <p className="text-sm text-muted-foreground">
              Order Management System
            </p>
          </div>

          {!configured && (
            <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              Supabase is not configured yet. Add your project URL and anon key
              to <code className="font-mono">.env</code> to enable login.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={busy || !configured}
            >
              {busy ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
