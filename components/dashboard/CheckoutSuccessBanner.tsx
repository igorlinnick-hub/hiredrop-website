"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The moment after money changed hands used to be silent: Stripe redirects to
 * /dashboard?checkout=success and the page said nothing (found live, 2026-09-06 —
 * the very first paying user got no confirmation at all).
 *
 * `tier` comes from the server render. The webhook usually lands before Stripe
 * finishes redirecting, so most users see "Pro is active" immediately; if the
 * grant is still in flight we say so honestly and refresh once, instead of
 * pretending. Dismiss (or the auto URL-cleanup) removes the flag so a reload
 * doesn't re-celebrate.
 */
export default function CheckoutSuccessBanner({ tier }: { tier: string }) {
  const router = useRouter();
  const isPro = tier !== "free";
  const [dismissed, setDismissed] = useState(false);
  // Read window.location after mount instead of useSearchParams (house pattern —
  // see LoginForm.tsx / settings page — to avoid the Suspense boundary).
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") !== "success") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time read of the URL (house pattern above)
    setShow(true);
    // Strip the flag once shown — bookmarks/reloads stay clean.
    const t = setTimeout(() => {
      window.history.replaceState(null, "", "/dashboard");
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Grant still in flight (webhook races the redirect) → one refresh after a
  // short wait picks up the tier without the user doing anything.
  useEffect(() => {
    if (!show || isPro) return;
    const t = setTimeout(() => router.refresh(), 4000);
    return () => clearTimeout(t);
  }, [show, isPro, router]);

  if (!show || dismissed) return null;

  return (
    <div
      className="rounded-xl border border-accent/40 bg-accent/10 px-5 py-4 flex items-start justify-between gap-4"
      role="status"
    >
      <div>
        <p className="font-semibold text-text">
          {isPro ? "🎉 Payment received — Pro is active." : "🎉 Payment received."}
        </p>
        <p className="text-sm text-text2 mt-0.5">
          {isPro
            ? "Higher daily limits are live. Cancel anytime in Settings → Billing."
            : "Activating your plan — this takes under a minute. The page will refresh itself."}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-text2/60 hover:text-text transition p-1 -mr-1"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
