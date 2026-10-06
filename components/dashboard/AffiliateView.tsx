"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AffiliateHero from "@/components/affiliate/AffiliateHero";
import { ApiError, createAffiliateConnect } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export interface AffiliateStats {
  code: string;
  status: string;
  commission_pct: number;
  paypal_email: string | null;
  connect_status: "none" | "pending" | "enabled";
  clicks: number;
  signups: number;
  paying: number;
  earned_cents: number;
  pending_cents: number;
  paid_cents: number;
}

export interface AffiliateCommission {
  created_at: string;
  gross_cents: number;
  amount_cents: number;
  status: string;
}

export interface AffiliatePayout {
  amount_cents: number;
  method: string;
  status: string;
  // null while a Connect transfer is still `pending` — only set once Stripe
  // actually confirms the money moved (scripts/run_affiliate_payouts.py).
  paid_at: string | null;
}

const MIN_PAYOUT_CENTS = 2500; // matches scripts/affiliate_admin.py, scripts/run_affiliate_payouts.py

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function LinkCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `https://hiredrop.io/?ref=${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false); // clipboard blocked — the link is selectable above
    }
  }

  return (
    <div className="hd-glass hd-glass-bloom rounded-2xl p-5">
      <p className="text-sm text-text2">Your link</p>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
        <code className="flex-1 font-mono text-[15px] text-text break-all bg-surface2/60 rounded-xl px-4 py-3">
          {link}
        </code>
        <button
          onClick={copy}
          className="shrink-0 bg-accent hover:bg-accent/90 text-white font-semibold px-5 py-3 rounded-xl transition"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="mt-3 text-[13px] text-text2">
        Anyone who clicks it is credited to you for 60 days, even if they sign up later.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="hd-glass hd-glass-bloom rounded-2xl p-4">
      <p className="text-sm text-text2">{label}</p>
      <p className="text-2xl font-bold text-text mt-1 tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-text2/60 font-medium">{hint}</p>}
    </div>
  );
}

/** Connect (or finish connecting) the Stripe Express account payouts land in.
 *
 * One button, three states (`stats.connect_status`, set server-side off
 * `affiliate_stats()` — never trust a client flag for this). The click asks
 * our OWN backend for a fresh onboarding link and does a full-page redirect:
 * unlike the billing portal, Stripe's own return_url brings them straight
 * back here, so there's no second tab to manage.
 */
function ConnectPayoutsCard({ status }: { status: AffiliateStats["connect_status"] }) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new ApiError(401, "Session expired — please log in again.");
      const { url } = await createAffiliateConnect(session.access_token);
      window.location.assign(url); // Stripe-hosted onboarding; return_url comes back here
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start onboarding. Please try again.");
      setBusy(false);
    }
  }

  if (status === "enabled") {
    return (
      <div className="hd-glass hd-glass-bloom rounded-2xl p-5 flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
        <div>
          <p className="font-semibold text-text">Payouts connected</p>
          <p className="text-[13px] text-text2">
            Stripe pays commissions automatically once they&apos;re 30 days old.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hd-glass hd-glass-bloom rounded-2xl p-5">
      <p className="font-semibold text-text">
        {status === "pending" ? "Finish connecting your payout account" : "Connect a payout account"}
      </p>
      <p className="mt-1 text-[13px] text-text2">
        {status === "pending"
          ? "Stripe needs a couple more details before it can pay you — this takes two minutes."
          : "Set up a free Stripe account so commissions pay out automatically, no PayPal address to send us."}
      </p>
      <button
        onClick={connect}
        disabled={busy}
        className="mt-3 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
      >
        {busy ? "Opening Stripe…" : status === "pending" ? "Continue setup" : "Connect payouts"}
      </button>
      {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
    </div>
  );
}

const RETURN_POLLS = 5; // × 3 s — the account.updated webhook usually lands within seconds

/** What the partner sees right after Stripe sends them back.
 *
 * Stripe's return_url / refresh_url (app/routers/affiliate.py) land here with
 * `?connect=return` or `?connect=refresh`. Without this the only sign that
 * onboarding worked was the status card below the fold flipping quietly — a
 * partner who just typed their SSN and bank got no "done" at all (10-06).
 * `connect_status` stays the authority: the banner reads it, never the query.
 */
function ConnectReturnBanner({ status }: { status: AffiliateStats["connect_status"] }) {
  const router = useRouter();
  const [arrival, setArrival] = useState<"return" | "refresh" | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    const url = new URL(window.location.href);
    const connect = url.searchParams.get("connect");
    if (connect !== "return" && connect !== "refresh") return;
    // Mount-time read of window.location instead of useSearchParams — house
    // pattern (CheckoutSuccessBanner.tsx) that avoids a Suspense boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time read of the URL (see above)
    setArrival(connect);
    // A reload or a shared link must not replay the moment.
    url.searchParams.delete("connect");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  // Back from Stripe before the webhook flipped payouts_enabled: re-read the
  // server a few times rather than tell someone who just finished "not yet".
  useEffect(() => {
    if (arrival !== "return" || status === "enabled" || polls >= RETURN_POLLS) return;
    const t = setTimeout(() => {
      router.refresh();
      setPolls((n) => n + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [arrival, status, polls, router]);

  if (!arrival) return null;

  const done = status === "enabled";
  const checking = arrival === "return" && !done && polls < RETURN_POLLS;
  const title = done
    ? "You're all set — payouts are on"
    : checking
      ? "Confirming with Stripe…"
      : arrival === "refresh"
        ? "That setup link expired"
        : "Stripe needs a few more details";
  const body = done
    ? "Thanks for connecting. Every commission pays out to your bank automatically once it's 30 days old — nothing to ask us for."
    : checking
      ? "Your details are in. This page updates on its own in a few seconds."
      : arrival === "refresh"
        ? "Nothing you entered is lost. Press Continue setup below to pick up where you left off."
        : "Your account isn't ready to receive payouts yet. Press Continue setup below to finish — it takes two minutes.";

  return (
    <div
      role="status"
      className={[
        "rounded-2xl border p-5 flex items-start gap-3",
        done ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-400/40 bg-amber-400/10",
      ].join(" ")}
    >
      <span
        className={[
          "mt-1.5 h-2.5 w-2.5 rounded-full shrink-0",
          done ? "bg-emerald-500" : "bg-amber-400",
          checking ? "animate-pulse" : "",
        ].join(" ")}
      />
      <div className="flex-1">
        <p className="font-semibold text-text">{title}</p>
        <p className="mt-1 text-sm text-text2">{body}</p>
      </div>
      {!checking && (
        <button
          onClick={() => setArrival(null)}
          aria-label="Dismiss"
          className="shrink-0 text-text2 hover:text-text text-lg leading-none px-1"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function AffiliateView({
  stats,
  commissions,
  payouts,
}: {
  stats: AffiliateStats;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
}) {
  const pct = Math.round(Number(stats.commission_pct));
  const belowMinimum = stats.pending_cents > 0 && stats.pending_cents < MIN_PAYOUT_CENTS;

  return (
    <div className="space-y-6">
      <ConnectReturnBanner status={stats.connect_status} />

      {/* Same panel as /affiliate, by Igor's instruction (2026-09-21): the page
          that sold the program and the page that runs it should be recognisably
          the same place. */}
      <AffiliateHero
        compact
        eyebrow="Your affiliate account"
        title={
          <>
            You earn <em className="italic">{pct}%</em> of every payment they make.
          </>
        }
        body="For as long as they stay subscribed — not just the first month. Paid automatically once a commission is 30 days old."
      />

      {stats.status !== "active" && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-text">
          Your account is <b>{stats.status}</b>, so new signups aren&apos;t being credited to your
          link right now. Reply to the email that gave you the code and we&apos;ll sort it out.
        </div>
      )}

      <LinkCard code={stats.code} />

      {/* Opens arrived with affiliate_clicks (2026-09-21). Before that this tile
          was deliberately absent: a "0 clicks" with nothing counting them reads
          as "nobody clicked", which is a different and much worse message. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Link opens" value={String(stats.clicks)} hint="same person once a day" />
        <Stat label="Signed up" value={String(stats.signups)} hint="used your link" />
        <Stat label="Paying now" value={String(stats.paying)} hint="subscribed at least once" />
        <Stat label="Earned" value={money(stats.earned_cents)} hint="all time, refunds removed" />
        <Stat
          label="Next payout"
          value={money(stats.pending_cents)}
          hint={belowMinimum ? `rolls over under ${money(MIN_PAYOUT_CENTS)}` : "pays out automatically"}
        />
      </div>

      <ConnectPayoutsCard status={stats.connect_status} />

      <div className="hd-glass hd-glass-bloom rounded-2xl p-5">
        <h2 className="font-semibold text-text mb-3">Commissions</h2>
        {commissions.length === 0 ? (
          <p className="text-sm text-text2">
            Nothing yet. A commission appears here the day a referral actually pays — not when
            they sign up.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text2 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">They paid</th>
                  <th className="pb-2 font-medium">You earned</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {commissions.map((c, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-2.5 tabular-nums">{c.created_at.slice(0, 10)}</td>
                    <td className="py-2.5 tabular-nums">{money(c.gross_cents)}</td>
                    <td className="py-2.5 tabular-nums font-medium">{money(c.amount_cents)}</td>
                    <td className="py-2.5">
                      <span
                        className={[
                          "px-2 py-0.5 rounded-full text-[11px] font-medium",
                          c.status === "paid_out"
                            ? "bg-accent/10 text-accent"
                            : c.status === "reversed"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-surface2 text-text2",
                        ].join(" ")}
                      >
                        {c.status === "paid_out"
                          ? "paid out"
                          : c.status === "reversed"
                            ? "refunded"
                            : "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payouts.length > 0 && (
        <div className="hd-glass hd-glass-bloom rounded-2xl p-5">
          <h2 className="font-semibold text-text mb-3">Payouts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text2 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {payouts.map((p, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-2.5 tabular-nums">{p.paid_at ? p.paid_at.slice(0, 10) : "—"}</td>
                    <td className="py-2.5 tabular-nums font-medium">{money(p.amount_cents)}</td>
                    <td className="py-2.5">
                      <span
                        className={[
                          "px-2 py-0.5 rounded-full text-[11px] font-medium",
                          p.status === "completed"
                            ? "bg-accent/10 text-accent"
                            : p.status === "failed"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-surface2 text-text2",
                        ].join(" ")}
                      >
                        {p.status === "pending" ? "processing" : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="hd-glass rounded-2xl p-5 text-sm text-text2 space-y-2">
        <h2 className="font-semibold text-text">How you get paid</h2>
        <p>
          A commission becomes payable 30 days after it accrues — that&apos;s the window in which a
          customer can still get a refund, which would take the commission back with it. Anything
          under {money(MIN_PAYOUT_CENTS)} rolls into next month. Once you&apos;re connected (above),
          Stripe pays out automatically — nothing to ask us for.
        </p>
        <p>
          One rule worth repeating: say you earn a commission when you share the link. &ldquo;I get
          a cut if you sign up&rdquo; or <code>#ad</code> is the FTC&apos;s requirement, not ours.
        </p>
      </div>
    </div>
  );
}
