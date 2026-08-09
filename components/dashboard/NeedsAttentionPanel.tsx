"use client";

/**
 * NeedsAttentionPanel — the two trust surfaces from council #3, on the dashboard:
 *
 *  1. "Needs your hands" — jobs the executor filled but could NOT submit honestly
 *     (validation-blocked / no submit button / resume). The extension logs them as
 *     "✋ Needs your hands: <job> — <reason>. Finish it yourself: <url>" activity
 *     lines; here they become actionable rows with a deep link. The product
 *     invariant: every approved job ends submitted-complete-and-honest OR handed
 *     back with a reason — this panel is the "handed back" surface.
 *
 *  2. Receipts — per-application confirmation captures (page text + screenshot at
 *     the submit moment, chrome.storage.receipts). Employer emails aren't
 *     guaranteed (the Mavenclinic lesson) — the receipt is our own proof.
 *
 * Data comes straight from the extension via the ping.js bridge
 * (HIREDROP_READ_STORAGE → HIREDROP_STORAGE_DATA) — no backend, no deploy risk.
 * Renders nothing when both lists are empty (no dashboard noise).
 * Theme-safe: only semantic tokens (surface/border/text/text2/accent).
 */

import { useEffect, useState } from "react";

type Receipt = {
  at: string;
  job_title: string;
  company: string;
  platform: string;
  job_url: string;
  verified: boolean;
  signal: string;
  shot?: string | null;
};

type HandBack = { job: string; reason: string; url: string };

const HANDBACK_RE = /Needs your hands:\s*(.+?)\s+—\s+(.+?)(?:\.\s*Finish it yourself:\s*(\S+))?$/;

export default function NeedsAttentionPanel() {
  const [handbacks, setHandbacks] = useState<HandBack[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [openShot, setOpenShot] = useState<string | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.type !== "HIREDROP_STORAGE_DATA") return;
      const d = e.data.data || {};
      const log: unknown[] = Array.isArray(d.activity_log) ? d.activity_log : [];
      const seen = new Set<string>();
      const hbs: HandBack[] = [];
      for (const entry of log) {
        const text =
          typeof entry === "string"
            ? entry
            : ((entry as { text?: string; message?: string })?.text ??
               (entry as { message?: string })?.message ?? "");
        const m = HANDBACK_RE.exec(text);
        if (!m) continue;
        const key = m[1] + (m[3] || "");
        if (seen.has(key)) continue;
        seen.add(key);
        hbs.push({ job: m[1], reason: m[2], url: m[3] || "" });
        if (hbs.length >= 5) break;
      }
      setHandbacks(hbs);
      setReceipts(Array.isArray(d.receipts) ? (d.receipts as Receipt[]).slice(0, 5) : []);
    };
    window.addEventListener("message", onMsg);
    const ask = () =>
      window.postMessage(
        { type: "HIREDROP_READ_STORAGE", keys: ["activity_log", "receipts"] },
        "*"
      );
    ask();
    const iv = setInterval(ask, 12000);
    return () => {
      window.removeEventListener("message", onMsg);
      clearInterval(iv);
    };
  }, []);

  if (handbacks.length === 0 && receipts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      {handbacks.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-text flex items-center gap-2">
            ✋ Needs your hands
            <span className="text-[11px] font-normal text-text2">
              filled as far as possible — finish &amp; submit yourself
            </span>
          </p>
          <ul className="mt-2 space-y-1.5">
            {handbacks.map((h, i) => (
              <li key={i} className="text-[13px] leading-snug">
                {h.url ? (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent hover:underline"
                  >
                    {h.job} ↗
                  </a>
                ) : (
                  <span className="font-medium text-text">{h.job}</span>
                )}
                <span className="text-text2"> — {h.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {receipts.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-text flex items-center gap-2">
            🧾 Application receipts
            <span className="text-[11px] font-normal text-text2">
              proof captured at the submit moment
            </span>
          </p>
          <ul className="mt-2 space-y-1.5">
            {receipts.map((r, i) => (
              <li key={i} className="text-[13px] leading-snug flex items-center gap-2 flex-wrap">
                <span
                  className={[
                    "inline-block w-2 h-2 rounded-full shrink-0",
                    r.verified ? "bg-emerald-500" : "bg-amber-400",
                  ].join(" ")}
                  title={r.verified ? `confirmed (${r.signal})` : "submitted, confirmation page not detected"}
                />
                <span className="font-medium text-text">
                  {r.job_title} @ {r.company}
                </span>
                <span className="text-text2">
                  {r.platform} · {new Date(r.at).toLocaleString()}
                </span>
                {r.shot && (
                  <button
                    onClick={() => setOpenShot(openShot === r.shot ? null : r.shot!)}
                    className="text-[11px] text-accent hover:underline"
                  >
                    {openShot === r.shot ? "hide proof" : "view proof"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {openShot && (
            <div className="mt-3 rounded-lg border border-border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={openShot} alt="Submission confirmation screenshot" className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
