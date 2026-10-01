"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { landingAfterAuth } from "@/lib/gate/landing";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";

// /auth/callback bounces failed email confirmations here with ?error=<raw
// Supabase message>. Translate the known ones — users shouldn't read PKCE
// internals.
function humanizeAuthError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("code verifier") || msg.includes("different browser or device")) {
    return "That confirmation link only works in the browser you signed up from. Open the email on the same device, or sign in below — we'll send a fresh link if your email still needs confirming.";
  }
  if (msg.includes("expired") || msg.includes("invalid")) {
    return "That confirmation link has expired or was already used. Sign in below — we'll send a fresh link if your email still needs confirming.";
  }
  return raw;
}

export default function LoginForm() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // window.location isn't available during prerender — read the error param
  // after mount instead of via useSearchParams (which would force a Suspense
  // boundary on the whole login page).
  useEffect(() => {
    const urlError = new URLSearchParams(window.location.search).get("error");
    if (urlError) setError(humanizeAuthError(urlError));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Route through the onboarding quiz when it hasn't been completed —
    // mirrors /auth/callback (which only OAuth/email links pass through;
    // password login used to hardcode /dashboard and skip the quiz entirely).
    // The /dashboard layout gate enforces this server-side too; checking here
    // just lands the user on the right page in one hop.
    let onboarded = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", signInData.user.id)
        .maybeSingle();
      onboarded = !!profile?.onboarding_completed;
    } catch {
      // fail-closed: unknown state → onboarding (the wizard bounces completed
      // users onward via the dashboard gate anyway)
    }
    // An affiliate coming back to check their earnings must not be handed the
    // job-seeker quiz — measured 26.09: the email path had learned this, the
    // password path had not. Both now ask lib/gate/landing.ts.
    let isAffiliate = false;
    try {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("code")
        .eq("user_id", signInData.user.id)
        .maybeSingle();
      isAffiliate = !!affiliate;
    } catch {
      // unknown → not an affiliate; the worst case is the quiz, as before
    }

    const params = new URLSearchParams(window.location.search);
    const dest = landingAfterAuth({
      next: params.get("next"),
      onboarded,
      isAffiliate,
      affiliateIntent: signInData.user.user_metadata?.affiliate_intent === true,
    });
    const h = window.location.hostname;
    const onWrongDomain = h !== "hiredrop.io" && !h.endsWith(".hiredrop.io");
    // If on a preview URL, navigate to hiredrop.io so the extension can inject
    const base = onWrongDomain ? "https://hiredrop.io" : "";
    window.location.href = base + dest;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        required
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
          <input type="checkbox" name="remember" className="rounded border-border accent-accent" />
          Remember me
        </label>
        <a href="/auth/reset-password" className="text-sm text-accent hover:text-accent2">
          Forgot password?
        </a>
      </div>

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-4 text-text2">or continue with</span>
        </div>
      </div>

      <GoogleButton intent="signin" />
    </form>
  );
}
