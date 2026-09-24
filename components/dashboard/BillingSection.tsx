"use client";

import { useEffect, useState } from "react";
import { ApiError, apiGet, createCheckout, openBillingPortal, type StatsResponse } from "@/lib/api";
import { MONTHLY_PRICE, WEEKLY_PRICE } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
  { key: "weekly", name: "Weekly", price: WEEKLY_PRICE, per: "/wk", blurb: "Everything — auto-apply, AI cover letters, ATS resume tailoring. Pay while you search." },
  { key: "monthly", name: "Monthly", price: MONTHLY_PRICE, per: "/mo", blurb: "Same product, billed monthly — better value if your search runs longer." },
];

/** Open Stripe in a NEW tab, keeping the dashboard tab alive (Igor 09-24: the
 *  portal took over the page and coming back landed on /login).
 *
 *  The tab is opened SYNCHRONOUSLY inside the click — a window.open after an
 *  await is not a user gesture any more and pop-up blockers eat it. The blank
 *  tab is parked until the URL arrives; if the browser refused to open one, we
 *  fall back to navigating this tab, which is still better than nothing. */
function openInNewTab(): { go: (url: string) => void; fail: () => void } {
  // NOT "noopener": that feature string makes window.open return null by spec,
  // so we would hold no handle, never navigate the new tab, and fall back to
  // taking over THIS one — the exact bug this helper exists to prevent (caught
  // by testing the live page, 09-24). We drop the back-reference instead, which
  // gives the same protection and keeps the handle.
  let tab: Window | null = null;
  if (typeof window !== "undefined") {
    tab = window.open("", "_blank");
    if (tab) {
      try { tab.opener = null; } catch { /* cross-origin already, nothing to clear */ }
    }
  }
  return {
    go: (url: string) => {
      if (tab && !tab.closed) tab.location.replace(url);
      else window.location.assign(url); // pop-up blocked → old behaviour beats nothing
    },
    fail: () => { if (tab && !tab.closed) tab.close(); },
  };
}

export default function BillingSection() {
  const supabase = createClient();
  const [tier, setTier] = useState<string | null>(null);
  const [freeTaste, setFreeTaste] = useState<{ used: number; limit: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "weekly" | "monthly" | "portal"
  const [error, setError] = useState("");

  // Load the current tier so we can mark the active plan / show the manage button.
  // Re-read it when this tab regains focus: a plan bought or cancelled in the
  // Stripe tab must not leave this one claiming the old one.
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const stats = await apiGet<StatsResponse>("/stats", session.access_token);
        setTier(stats.tier);
        if (stats.tier === "free" && typeof stats.free_limit === "number") {
          setFreeTaste({ used: stats.free_used ?? 0, limit: stats.free_limit });
        }
      } catch {
        // Non-fatal — buttons still work; we just can't highlight the current plan.
      }
    }
    load();
    const onFocus = () => { load(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch a fresh token per action — it can expire between mount and click.
  async function freshToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new ApiError(401, "Session expired — please log in again.");
    return session.access_token;
  }

  async function upgrade(plan: string) {
    const tab = openInNewTab();
    setBusy(plan);
    setError("");
    try {
      const { url } = await createCheckout(plan, await freshToken());
      tab.go(url); // external Stripe Checkout — not a Next route
      setBusy(null);
    } catch (e) {
      tab.fail();
      setError(e instanceof ApiError ? e.message : "Could not start checkout. Please try again.");
      setBusy(null);
    }
  }

  async function manage() {
    const tab = openInNewTab();
    setBusy("portal");
    setError("");
    try {
      const { url } = await openBillingPortal(await freshToken());
      tab.go(url); // external Stripe Billing Portal
      setBusy(null);
    } catch (e) {
      tab.fail();
      setError(e instanceof ApiError ? e.message : "Could not open the billing portal.");
      setBusy(null);
    }
  }

  const isAdmin = tier === "admin";
  const isPaid = tier === "pro" || tier === "premium" || tier === "elite";
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null;
  const pct = freeTaste && freeTaste.limit
    ? Math.min(100, Math.round((freeTaste.used / freeTaste.limit) * 100))
    : null;

  // What the state line says. It always says SOMETHING: a billing section that
  // collapses to one grey sentence on an internal tier reads as "we have no
  // billing" (Igor 09-23), which is exactly the wrong impression.
  const state = isAdmin
    ? { name: "Admin", blurb: "Internal plan — unlimited applications, nothing to pay." }
    : isPaid
      ? { name: tierLabel ?? "Subscribed", blurb: "Active subscription. Change the plan or cancel any time in the portal." }
      : freeTaste
        ? {
          name: "Free taste",
          blurb: freeTaste.used >= freeTaste.limit
            ? `All ${freeTaste.limit} free applications used — pick a plan to keep applying.`
            : `${freeTaste.used} of ${freeTaste.limit} free applications used.`,
        }
        : { name: tierLabel ?? "No plan yet", blurb: "Pick a plan to start applying." };

  return (
    <section id="billing" className="space-y-3 scroll-mt-24" data-testid="billing-section">
      {/* THE STATE — what you are on right now, and the one action that changes it. */}
      <div className="hd-sheet p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="hd-eyebrow">Current plan</p>
            <h3 className="hd-hist-display mt-1.5 !text-[30px]">{state.name}</h3>
            <p className="hd-hist-sub mt-2 max-w-md leading-relaxed">{state.blurb}</p>
          </div>
          {(isPaid || isAdmin) && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={manage}
              className="hd-chip shrink-0"
            >
              {busy === "portal" ? "Opening…" : "Manage / cancel"}
            </button>
          )}
        </div>

        {/* The free taste is a quota, so it gets a meter — the same form the
            Insights panel uses for a single ratio. */}
        {pct !== null && (
          <div className="mt-5">
            <div className="hd-quota" role="img"
              aria-label={`${freeTaste!.used} of ${freeTaste!.limit} free applications used`}>
              <span className="hd-quota-fill" style={{ ["--w" as string]: `${pct}%` }} />
            </div>
            <p className="hd-eyebrow mt-2 tabular-nums">
              {freeTaste!.used} / {freeTaste!.limit} used
            </p>
          </div>
        )}
      </div>

      {error && <div className="hd-sheet p-3 text-sm text-red">{error}</div>}

      {/* THE PLANS — shown even to a subscriber, so the page always says what
          the product costs instead of hiding it behind a portal redirect. */}
      <div className="hd-sheet p-5 sm:p-6">
        <h3 className="hd-hist-sub-head">Plans</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((p) => (
            <div key={p.key} className="hd-plan">
              <div className="flex items-baseline justify-between gap-3">
                <span className="hd-eyebrow hd-eyebrow-ink">{p.name}</span>
                <span className="hd-plan-price">
                  {p.price}<span className="hd-plan-per">{p.per}</span>
                </span>
              </div>
              <p className="hd-hist-sub mt-2 flex-1 leading-snug">{p.blurb}</p>
              {isAdmin || isPaid ? (
                <p className="hd-eyebrow mt-3">
                  {isAdmin ? "Not billed on this account" : "Switch plans in the portal"}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => upgrade(p.key)}
                  className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white
                    transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {busy === p.key ? "Redirecting…" : `Choose ${p.name}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
