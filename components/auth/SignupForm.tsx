"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { redeemPromoCode } from "@/lib/promo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitlisted, setWaitlisted] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const firstName = form.get("first_name") as string;
    const lastName = form.get("last_name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const confirm = form.get("confirm_password") as string;
    // Promo code is validated SERVER-SIDE after signup (never read client-side),
    // so we just carry it through — case-sensitive, no client validation.
    const promoCode = (form.get("promo_code") as string || "").trim();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      setLoading(false);
      return;
    }

    // Sign up. The promo code rides along in metadata so onboarding can redeem it
    // even when email confirmation is on (no session yet at this point).
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          ...(promoCode ? { promo_code: promoCode } : {}),
        },
      },
    });

    if (authError) {
      const msg = authError.message?.toLowerCase() || "";
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already")
      ) {
        setError("An account with this email already exists. Try signing in instead.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // If a session exists (email confirmation off), redeem the promo now for
    // instant Elite. Otherwise onboarding redeems it from metadata after confirm.
    if (signUpData.session) {
      if (promoCode) {
        await redeemPromoCode(promoCode, signUpData.session.access_token);
      }
      setLoading(false);
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setLoading(false);
    // Otherwise show "check your email" screen
    setConfirmationEmail(email);
    setConfirmationSent(true);
  }

  async function handleGoogleSignup() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  if (confirmationSent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text">Check your email</h3>
        <p className="text-sm text-text2">
          We sent a confirmation link to <span className="text-text font-medium">{confirmationEmail}</span>.
          Click it to activate your account, then sign in.
        </p>
        <p className="text-xs text-text2">
          Didn&apos;t get it? Check spam, or wait a minute and try again.
        </p>
      </div>
    );
  }

  if (waitlisted) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text">You&apos;re on the waitlist!</h3>
        <p className="text-sm text-text2">
          We&apos;ll send you an invite code when a spot opens up. Stay tuned.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          name="first_name"
          placeholder="John"
          required
          autoComplete="given-name"
        />
        <Input
          label="Last name"
          name="last_name"
          placeholder="Doe"
          required
          autoComplete="family-name"
        />
      </div>

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
        placeholder="Min. 8 characters"
        required
        autoComplete="new-password"
      />

      <Input
        label="Confirm password"
        name="confirm_password"
        type="password"
        placeholder="Repeat password"
        required
        autoComplete="new-password"
      />

      <Input
        label="Promo code"
        name="promo_code"
        placeholder="Enter code (optional)"
        hint="Have a promo code? Enter it for free Elite access."
      />

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Creating account..." : "Create Account"}
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-4 text-text2">or sign up with</span>
        </div>
      </div>

      <Button type="button" variant="secondary" fullWidth onClick={handleGoogleSignup}>
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Google
      </Button>

      <p className="text-xs text-text2 text-center">
        By signing up, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
