"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { redeemPromoCode } from "@/lib/promo";
import { getSignupAttribution } from "@/lib/attribution";
import { markNewSignup } from "@/lib/adPixels";
import { isObfuscatedExistingUser } from "@/lib/auth/signup-result";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleButton from "@/components/auth/GoogleButton";

/**
 * `affiliateCode` means this signup came from an issued affiliate link
 * (/signup?affiliate=<code>&email=<them>). Two things change: the email is
 * prefilled, because the reservation is redeemed by EMAIL and a different
 * address silently produces an account with no link; and they land on their
 * affiliate screen instead of the job-seeker quiz, which an ambassador who
 * isn't job hunting has no reason to answer.
 */
export default function SignupForm({
  affiliateCode = "",
  affiliateIntent = false,
  prefillEmail = "",
}: {
  affiliateCode?: string;
  /** Came from the affiliate landing without a code — they are here to apply. */
  affiliateIntent?: boolean;
  prefillEmail?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitlisted, setWaitlisted] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  // Supabase will not admit that an address is taken — signUp answers a
  // *successful-looking* result with no identities instead, so that this form
  // cannot be used to enumerate who has an account. Without reading that
  // signal, someone who already has a HireDrop account is told to check an
  // inbox nothing will ever arrive in.
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

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
    // First-touch attribution (utm_*/ref/click ids) rides the same way, plus
    // this browser's ad identity keys (fbp/fbc/ua/ads_optout) — /auth/callback
    // persists it to profiles after the email is confirmed.
    const attribution = getSignupAttribution();
    // With email confirmation on there is no session here, so the push below
    // never runs — /auth/callback decides where they land. It honours a safe
    // relative `next`, which is how an affiliate arrival survives the round
    // trip through their inbox instead of being dropped into the job-seeker
    // quiz they never asked for.
    const afterAuth = affiliateCode || affiliateIntent ? "/dashboard/affiliate" : "";
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          `${window.location.origin}/auth/callback` +
          (afterAuth ? `?next=${encodeURIComponent(afterAuth)}` : ""),
        data: {
          first_name: firstName,
          last_name: lastName,
          ...(promoCode ? { promo_code: promoCode } : {}),
          ...(attribution ? { attribution } : {}),
          // Survives the round trip through their inbox. The confirmation
          // template does not carry redirect_to — measured 25.09 on the live
          // site: the emailed link is /auth/callback?token_hash=…&type=signup
          // and nothing else — so an affiliate confirming by email landed in
          // the job-seeker quiz. Metadata is on the user, so the callback can
          // still tell who they are.
          ...(afterAuth ? { affiliate_intent: true } : {}),
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

    if (isObfuscatedExistingUser(signUpData)) {
      setLoading(false);
      setConfirmationEmail(email);
      setAlreadyRegistered(true);
      return;
    }

    // If a session exists (email confirmation off), redeem the promo now for
    // instant Elite. Otherwise onboarding redeems it from metadata after confirm.
    if (signUpData.session) {
      if (promoCode) {
        await redeemPromoCode(promoCode, signUpData.session.access_token);
      }
      // /auth/callback is never visited on this path — persist attribution
      // directly. Guarded server-side by "attribution is null" (first touch).
      if (attribution && signUpData.user) {
        try {
          await supabase
            .from("profiles")
            .update({ attribution, attributed_at: new Date().toISOString() })
            .eq("user_id", signUpData.user.id)
            .is("attribution", null);
        } catch {
          // attribution is analytics, not auth
        }
      }
      // Same hand-off /auth/callback makes on the confirm path: the next page
      // reports the sign-up conversion once. Affiliates are partners, not
      // customers, and are never reported. No-op unless ads are configured.
      if (signUpData.user && !affiliateCode && !affiliateIntent) {
        markNewSignup(signUpData.user.id);
      }
      setLoading(false);
      router.push(affiliateCode || affiliateIntent ? "/dashboard/affiliate" : "/onboarding");
      router.refresh();
      return;
    }

    setLoading(false);
    // Otherwise show "check your email" screen
    setConfirmationEmail(email);
    setConfirmationSent(true);
  }

  if (alreadyRegistered) {
    const signInHref = affiliateCode || affiliateIntent
      ? "/login?next=%2Fdashboard%2Faffiliate"
      : "/login";
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text">You already have an account</h3>
        <p className="text-sm text-text2">
          <span className="text-text font-medium">{confirmationEmail}</span> is already registered.
          {affiliateCode || affiliateIntent
            ? " Sign in — the affiliate form is on your Affiliate page, and your link attaches to this account."
            : " Sign in to keep going."}
        </p>
        <Link
          href={signInHref}
          className="inline-block bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          Sign in
        </Link>
        <p className="text-xs text-text2">
          Forgot the password? <Link href="/auth/reset-password" className="text-accent">Reset it</Link>.
        </p>
      </div>
    );
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
        defaultValue={prefillEmail}
      />
      {affiliateCode && (
        <p className="-mt-2 text-[12.5px] text-text2">
          Your affiliate link <span className="font-medium text-text">?ref={affiliateCode}</span> is
          reserved for this address — sign up with a different one and it stays reserved.
        </p>
      )}

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
        hint="Have a promo code? Enter it for free access."
      />

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Creating account..." : "Create Account"}
      </Button>

      <GoogleButton
        intent="signup"
        divider="or sign up with"
        next={affiliateCode || affiliateIntent ? "/dashboard/affiliate" : null}
      />

      <p className="text-xs text-text2 text-center">
        By signing up, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
