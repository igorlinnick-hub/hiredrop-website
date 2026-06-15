"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";

type Phase = "checking" | "no-session" | "ready";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Recovery links use implicit flow (hash tokens). @supabase/ssr's
  // createBrowserClient does not auto-process hash fragments, so we parse
  // them manually and call setSession() directly.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data: { session }, error }) => {
          setPhase(session && !error ? "ready" : "no-session");
        });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setPhase(session ? "ready" : "no-session");
      });
    }
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-text">Set new password</h1>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {phase === "checking" && (
            <p className="text-center text-sm text-text2">Verifying your reset link…</p>
          )}

          {phase === "no-session" && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-text">This reset link is invalid or has expired.</p>
              <Link
                href="/auth/reset-password"
                className="inline-block text-accent hover:text-accent2 text-sm font-medium"
              >
                Request a new reset link
              </Link>
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>
              )}
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
              />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
