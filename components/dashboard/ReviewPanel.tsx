"use client";

import { useState } from "react";

export interface ReviewPending {
  id: string;
  job_title?: string;
  company?: string;
  description?: string;
  cover_letter?: string;
  summary?: string;
  job_url?: string;
  at?: number;
}

// Parse the extension's flat summary string ("name=... email=... resume=... radios=...")
// into labelled chips. Falls back to showing the raw string if it doesn't parse.
function parseSummary(summary?: string): { label: string; value: string }[] {
  if (!summary) return [];
  const out: { label: string; value: string }[] = [];
  const re = /(\w[\w-]*)="?([^"]*?)"?(?=\s+\w[\w-]*=|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(summary))) {
    const label = m[1].replace(/-/g, " ");
    const value = (m[2] || "").trim();
    if (value) out.push({ label, value });
  }
  return out;
}

// Tap-mode review surface: shown in place of the raw browser preview. It renders the
// application HireDrop just filled — job, generated cover letter, and the fields it
// entered — and lets the human Approve (submit) or Skip. Nothing sends until Approve.
export default function ReviewPanel({
  reviewPending,
  onDecision,
}: {
  reviewPending: ReviewPending | null;
  onDecision: (id: string, decision: "approve" | "skip") => void;
}) {
  const [acting, setActing] = useState<null | "approve" | "skip">(null);

  function decide(decision: "approve" | "skip") {
    if (!reviewPending || acting) return;
    setActing(decision);
    onDecision(reviewPending.id, decision);
    // Clear local busy state once the card is replaced by the next one (or cleared).
    setTimeout(() => setActing(null), 4000);
  }

  const chips = parseSummary(reviewPending?.summary);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header — explains the mode, sits apart from the cards */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent/12 text-accent shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 11V6a2 2 0 1 1 4 0v5m0-2a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7l-2-3a2 2 0 0 1 3.3-2.2L7.5 13" />
          </svg>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-text leading-tight">Tap mode — you approve each one</h3>
          <p className="text-xs text-text2/70 leading-tight mt-0.5">
            HireDrop filled everything. Nothing is sent until you tap Approve.
          </p>
        </div>
      </div>

      <div className="p-4 flex-1">
        {!reviewPending ? (
          // Waiting for the extension to finish filling the next application.
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16"
            style={{ minHeight: "min(52vh, 460px)" }}>
            <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-text2/70 font-medium">Filling the next application…</p>
            <p className="text-xs text-text2/40 max-w-[260px]">
              When it&apos;s ready, its card appears here for your review. Keep the automation window open.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-[fadeIn_.2s_ease]">
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

            {/* Job header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-base font-bold text-text leading-snug truncate">
                  {reviewPending.job_title || "Application"}
                </h4>
                {reviewPending.company && (
                  <p className="text-sm text-text2 truncate">{reviewPending.company}</p>
                )}
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                bg-green/10 text-green text-[11px] font-semibold border border-green/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                Ready
              </span>
            </div>

            {/* Cover letter — the thing worth reading before it sends */}
            {reviewPending.cover_letter ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">
                  Cover letter
                </p>
                <div className="text-[13px] text-text/90 leading-relaxed whitespace-pre-wrap
                  bg-surface2/50 border border-border rounded-lg p-3.5 max-h-[300px] overflow-y-auto">
                  {reviewPending.cover_letter}
                </div>
              </div>
            ) : reviewPending.description ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">
                  Role
                </p>
                <div className="text-[13px] text-text2 leading-relaxed
                  bg-surface2/50 border border-border rounded-lg p-3.5 max-h-[220px] overflow-y-auto">
                  {reviewPending.description}
                </div>
              </div>
            ) : null}

            {/* What was filled */}
            {chips.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">
                  Filled fields
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md
                      bg-surface2/60 border border-border/70 text-[11px] text-text2">
                      <span className="text-text2/50">{c.label}</span>
                      <span className="text-text font-medium max-w-[180px] truncate">{c.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {reviewPending.job_url && (
              <a href={reviewPending.job_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent hover:underline w-fit">
                Open the application page ↗
              </a>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => decide("skip")}
                disabled={!!acting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border
                  bg-surface text-text2 hover:bg-surface2 hover:text-text disabled:opacity-50 transition"
              >
                {acting === "skip" ? "Skipping…" : "Skip"}
              </button>
              <button
                onClick={() => decide("approve")}
                disabled={!!acting}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  text-sm font-bold bg-accent text-white hover:bg-accent2 disabled:opacity-50
                  transition shadow-sm"
              >
                {acting === "approve" ? (
                  "Submitting…"
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Approve &amp; Submit
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
