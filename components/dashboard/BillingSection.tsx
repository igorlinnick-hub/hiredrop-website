"use client";

import { useEffect, useState } from "react";
import { ApiError, apiGet, createCheckout, openBillingPortal, type StatsResponse } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
  { key: "pro", name: "Pro", price: "$19", blurb: "Auto-apply on all platforms, AI cover letters in your voice." },
  { key: "premium", name: "Premium", price: "$29", blurb: "Everything in Pro + AI resume tailored to each job." },
];

export default function BillingSection() {
  const supabase = createClient();
  const [tier, setTier] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "pro" | "premium" | "portal"
  const [error, setError] = useState("");

  // Load the current tier so we can mark the active plan / show the manage button.
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const stats = await apiGet<StatsResponse>("/stats", session.access_token);
        setTier(stats.tier);
      } catch {
        // Non-fatal — buttons still work; we just can't highlight the current plan.
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch a fresh token per action — it can expire between mount and click.
  async function freshToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new ApiError(401, "Session expired — please log in again.");
    return session.access_token;
  }

  async function upgrade(plan: string) {
    setBusy(plan);
    setError("");
    try {
      const { url } = await createCheckout(plan, await freshToken());
      window.location.assign(url); // external Stripe Checkout — not a Next route
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start checkout. Please try again.");
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("portal");
    setError("");
    try {
      const { url } = await openBillingPortal(await freshToken());
      window.location.assign(url); // external Stripe Billing Portal
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the billing portal.");
      setBusy(null);
    }
  }

  const isAdmin = tier === "admin";
  const isPaid = tier === "pro" || tier === "premium";
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null;

  return (
    <section id="billing" className="bg-surface border border-border rounded-xl p-6 space-y-4 scroll-mt-24">
      <div>
        <h3 className="font-semibold text-text">Billing &amp; Plan</h3>
        <p className="text-sm text-text2 mt-1">
          {isAdmin
            ? "You're on the Admin plan — unlimited."
            : tierLabel
              ? `Current plan: ${tierLabel}.`
              : "Choose a plan to unlock more applications and features."}
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>}

      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((p) => {
            const current = tier === p.key;
            return (
              <div
                key={p.key}
                className={[
                  "rounded-lg border p-4 flex flex-col",
                  current ? "border-accent bg-accent/5" : "border-border",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-text">{p.name}</span>
                  <span className="text-lg font-bold text-text">
                    {p.price}
                    <span className="text-xs text-text2 font-normal">/mo</span>
                  </span>
                </div>
                <p className="text-xs text-text2 mt-1 flex-1">{p.blurb}</p>
                <button
                  type="button"
                  disabled={busy !== null || current}
                  onClick={() => upgrade(p.key)}
                  className={[
                    "mt-3 text-sm font-medium py-2 px-4 rounded-lg transition",
                    current
                      ? "bg-surface2 text-text2 cursor-default"
                      : "bg-accent hover:bg-accent-hover text-white disabled:opacity-60",
                  ].join(" ")}
                >
                  {current ? "Current plan" : busy === p.key ? "Redirecting…" : `Choose ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isPaid && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={manage}
          className="text-sm font-medium text-accent hover:text-accent2 border border-accent/30 hover:border-accent/60 px-4 py-2 rounded-lg transition disabled:opacity-60"
        >
          {busy === "portal" ? "Opening…" : "Manage subscription / cancel"}
        </button>
      )}
    </section>
  );
}
