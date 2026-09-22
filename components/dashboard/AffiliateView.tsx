"use client";

import { useState } from "react";

import AffiliateHero from "@/components/affiliate/AffiliateHero";

export interface AffiliateStats {
  code: string;
  status: string;
  commission_pct: number;
  paypal_email: string | null;
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

const MIN_PAYOUT_CENTS = 2500; // matches scripts/affiliate_admin.py

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

export default function AffiliateView({
  stats,
  commissions,
}: {
  stats: AffiliateStats;
  commissions: AffiliateCommission[];
}) {
  const pct = Math.round(Number(stats.commission_pct));
  const belowMinimum = stats.pending_cents > 0 && stats.pending_cents < MIN_PAYOUT_CENTS;

  return (
    <div className="space-y-6">
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
        body="For as long as they stay subscribed — not just the first month. Paid monthly by PayPal."
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
          hint={belowMinimum ? `rolls over under ${money(MIN_PAYOUT_CENTS)}` : "paid monthly"}
        />
      </div>

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

      <div className="hd-glass rounded-2xl p-5 text-sm text-text2 space-y-2">
        <h2 className="font-semibold text-text">How you get paid</h2>
        <p>
          PayPal{stats.paypal_email ? ` to ${stats.paypal_email}` : ""}, once a month. A commission
          becomes payable 30 days after it accrues — that&apos;s the window in which a customer can
          still get a refund, which would take the commission back with it. Anything under{" "}
          {money(MIN_PAYOUT_CENTS)} rolls into next month.
        </p>
        {!stats.paypal_email && (
          <p className="text-text">
            We don&apos;t have a PayPal address for you yet — send us one before your first payout.
          </p>
        )}
        <p>
          One rule worth repeating: say you earn a commission when you share the link. &ldquo;I get
          a cut if you sign up&rdquo; or <code>#ad</code> is the FTC&apos;s requirement, not ours.
        </p>
      </div>
    </div>
  );
}
