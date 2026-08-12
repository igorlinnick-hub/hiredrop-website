"use client";

/**
 * NeedsAttentionPanel — the two trust surfaces from council #3. Lives UNDER the
 * application history (not on the main dashboard): this is the record of what
 * happened to each job, not a control the user acts on every session.
 *
 *  1. "Couldn't submit these" — jobs the executor filled but could NOT submit
 *     honestly (validation-blocked / no submit button / resume). The extension logs
 *     them as "✋ Needs your hands: <job> — <reason>. Finish it yourself: <url>"
 *     activity lines; here they become actionable rows with a deep link. The product
 *     invariant: every approved job ends submitted-complete-and-honest OR handed
 *     back with a reason — this panel is the "handed back" surface.
 *
 *     The user sees the FACT and the link, never our diagnostics: raw reasons like
 *     "submit blocked — 10 required fields still empty" are a field-count that means
 *     nothing to them and reads as failure theatre. userReason() maps them to one
 *     calm sentence; the raw string + unfilled-field labels go to the backend
 *     (activity_log.metadata_json, background.js ATS_JOB_FAILED) where WE read them.
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

/**
 * Raw hand-back reason → one plain sentence. Order matters: captcha and resume are
 * checked before the generic validation cases, because those messages also mention
 * the form. Anything unmatched falls through to the neutral line — a reason we
 * haven't classified must never leak its internals into the UI.
 */
const REASON_MAP: [RegExp, string][] = [
  [/captcha/i, "the site asked for a captcha — only you can pass it"],
  [/resume|upload/i, "the resume upload didn't go through"],
  [/submit button|no submit/i, "we couldn't find the submit button on this form"],
  [/required field|validation/i, "this form asks something we can't answer for you"],
  [/timeout|timed out/i, "the site stopped responding partway through"],
];

function userReason(raw: string): string {
  for (const [re, text] of REASON_MAP) if (re.test(raw)) return text;
  return "we couldn't finish this one automatically";
}

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
            Couldn&apos;t submit these
            <span className="text-[11px] font-normal text-text2">
              already filled in — open one and it&apos;s a click away
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
                {/* title = the raw reason, for support/debugging without putting our
                    diagnostics in front of the user. */}
                <span className="text-text2" title={h.reason}> — {userReason(h.reason)}</span>
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
