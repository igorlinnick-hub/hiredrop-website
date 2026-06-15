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

  // Recovery links from the admin generate_link API use implicit flow — tokens
  // arrive in the URL hash, not as a ?code= param. Supabase client detects this
  // automatically and fires PASSWORD_RECOVERY. We also check for an existing
  // session to support the case where someone navigates here after already
  // exchanging a code via /auth/callback.
  useEffect(() => {
    const hasRecoveryHash = typeof window !== "undefined" &&
      window.location.hash.includes("access_token");

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPhase("ready");
      } else if (!hasRecoveryHash) {
        // No session and no recovery tokens in hash — link is expired/invalid.
        setPhase("no-session");
      }
      // If hasRecoveryHash, wait for onAuthStateChange to fire PASSWORD_RECOVERY.
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setPhase("ready");
      }
    });

    return () => subscription.unsubscribe();
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
            <span className="text-accent">Job</span>Flow
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
