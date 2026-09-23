"use client";

/**
 * HistoryView — the dedicated "History" tab: the full record of what HireDrop did,
 * per day, with links, statuses, and proof. Consolidates three surfaces that were
 * scattered (application list on the dashboard + the receipts/hand-backs panel):
 *
 *  - Metrics strip: total applied, this week, responses, response rate.
 *  - "Couldn't submit these" (hand-backs): jobs the executor filled but couldn't
 *    submit honestly — actionable rows with a deep link (finish yourself). The
 *    product invariant's "handed back" surface.
 *  - Applications grouped BY DAY: each row = job, platform, status, applied-time,
 *    and a receipt (verified dot + confirmation screenshot) when we captured one.
 *    Every row expands into the full stored record: job-posting link, cover letter,
 *    tailored resume text, and the exact résumé PDF submitted (when they exist).
 *
 * Applications come from the backend (authoritative record, passed as a prop).
 * Receipts + hand-backs come from the extension via the ping.js bridge
 * (HIREDROP_READ_STORAGE), matched to applications by job title @ company.
 * Theme-safe: semantic tokens only.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Application } from "@/lib/types";
import { PLATFORMS, JOB_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { apiPatch, apiPost } from "@/lib/api";
import { useHandbacks, handbackProgress, type Handback } from "@/components/dashboard/useHandbacks";
import HandbackAnswers from "@/components/dashboard/HandbackAnswers";

type Receipt = {
  at: string; job_title: string; company: string; platform: string;
  job_url: string; verified: boolean; signal: string; shot?: string | null;
};

// Friendly text for a hand-back reason. Matched against the raw string the extension
// wrote via handBackJob() — the full text stays on the row's title attribute.
//
// No captcha row on purpose. A captcha never reaches this map: it is reported as
// DETECTION_TRIPPED (content.js), which PAUSES the whole campaign behind the "your turn"
// CTA on the campaign view. handBackJob is the opposite channel — "finish this ONE job
// yourself, the walk moved on" — and content.js states the split as a rule. A /captcha/
// row here was dead code that quietly implied captcha hand-backs exist; they don't.
const REASON_MAP: [RegExp, string][] = [
  [/resume|upload/i, "the resume upload didn't go through"],
  [/submit button|no submit/i, "we couldn't find the submit button"],
  [/required field|validation/i, "this form asks something we can't answer for you"],
  [/wouldn't accept our answers/i, "the form kept rejecting our answers — it wants something only you can give"],
  [/timeout|timed out/i, "the site stopped responding partway through"],
];
/** The questions we can actually ask the human. A hand-back whose wall was "no submit
 *  button" or "the resume upload failed" carries none, and must not sprout an Answer
 *  button that opens an empty form. */
const questionsFor = (h: { questions?: { label: string; options: string[] }[] }) =>
  (h.questions || []).filter((q) => (q.label || "").trim());

const userReason = (raw: string) => REASON_MAP.find(([re]) => re.test(raw))?.[1] ?? "we couldn't finish this one automatically";

const RESPONSE_STATUSES = new Set(["interview", "interview_invite", "rejected", "received", "hired"]);
// What the user may set by hand, in the order a search actually moves. Mirrors the
// backend's USER_SETTABLE_STATUSES (routers/applications.py) — `applied_unconfirmed`
// is missing from BOTH on purpose: it is the executor saying "we clicked but could
// not confirm", and a self-reported version of that is worth nothing. `applied` is
// here only so a mis-tap can be undone.
const SETTABLE: { value: string; label: string; hint: string }[] = [
  { value: "applied", label: "Applied", hint: "No reply yet" },
  { value: "received", label: "Received", hint: "They confirmed they got it" },
  { value: "interview", label: "Interview", hint: "They want to talk" },
  { value: "rejected", label: "Rejected", hint: "They passed" },
];
// Colour carries the meaning, so the row is readable without reading: green = they
// answered and it is good news, red = they answered and it is not, neutral = silence.
const STATUS_TONE: Record<string, string> = {
  interview: "border-green/45 text-green bg-green/5",
  interview_invite: "border-green/45 text-green bg-green/5",
  hired: "border-green/45 text-green bg-green/5",
  rejected: "border-red/40 text-red bg-red/5",
  received: "border-accent/40 text-accent bg-accent/5",
  applied_unconfirmed: "border-border text-text2",
};
const statusTone = (s: string) => STATUS_TONE[s] ?? "border-border text-text2";
const INTERVIEW_STATUSES = new Set(["interview", "interview_invite"]);
const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name ?? id;
const statusLabel = (s: string) => JOB_STATUSES.find((x) => x.value === s)?.label ?? s;
const dayKey = (iso: string) => (iso || "").slice(0, 10);
const prettyDay = (key: string) => {
  if (!key) return "Earlier";
  const d = new Date(key + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

export default function HistoryView({
  applications,
  onSetStatus,
  handbacksOverride,
}: {
  applications: Application[];
  /** Injected by /preview/history-chips so the picker works without a session.
   *  Real dashboard leaves it undefined and the live PATCH is used. */
  onSetStatus?: (id: string, status: string) => Promise<void>;
  /** Same trick for the hand-back rows: the live ones come from /handbacks, which
   *  needs a session, so a design review would otherwise never see them. */
  handbacksOverride?: Handback[];
}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  // Optimistic status edits, keyed by application id. The server is the record;
  // this is only so the chip changes under the finger instead of after a round trip.
  const [statusEdits, setStatusEdits] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const { items: liveHandbacks, reload: loadHandbacks, setItems: setHandbacks } = useHandbacks();
  const handbacks = handbacksOverride ?? liveHandbacks;
  const [openShot, setOpenShot] = useState<string | null>(null);
  // Which hand-back has its questions open, and which ones we just re-queued (so the
  // row can say so without waiting for the next 30s poll).
  const [answering, setAnswering] = useState<string | null>(null);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Mark what the employer answered. Optimistic, and it puts the old value back
  // if the write fails — a status that silently didn't save is worse than none.
  const setStatus = async (id: string, status: string, previous: string) => {
    setStatusEdits((prev) => ({ ...prev, [id]: status }));
    setStatusError(null);
    try {
      if (onSetStatus) {
        await onSetStatus(id, status);
        return;
      }
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      await apiPatch(`/applications/${id}/status`, session.access_token, { status });
    } catch {
      setStatusEdits((prev) => ({ ...prev, [id]: previous }));
      setStatusError("Couldn't save that — check your connection and try again.");
    }
  };

  // The user's own tick. We never see the employer's side, so this claims nothing
  // beyond "they say it's done" — and the wording in the UI says exactly that.
  const markHandbackDone = async (id: string) => {
    setHandbacks((prev) => prev.filter((h) => h.id !== id)); // optimistic: it's their click
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) return;
      await apiPost(`/handbacks/${id}/resolve`, session.access_token, {});
    } catch { loadHandbacks(); } // put it back if the server disagreed
  };

  // Pull receipts from the extension (bridge). Non-fatal if absent.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.type !== "HIREDROP_STORAGE_DATA") return;
      const d = e.data.data || {};
      setReceipts(Array.isArray(d.receipts) ? (d.receipts as Receipt[]) : []);
      // Hand-backs no longer come from this local log — see the /handbacks fetch below.
      // Parsing them out of log TEXT meant they could never be ticked off, and meant
      // this list and the popup's could disagree about what was still waiting.
    };
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_READ_STORAGE", keys: ["activity_log", "receipts"] }, "*");
    ask();
    const iv = setInterval(ask, 15000);
    return () => { window.removeEventListener("message", onMsg); clearInterval(iv); };
  }, []);

  const receiptFor = useMemo(() => {
    const map = new Map<string, Receipt>();
    for (const r of receipts) map.set(`${(r.job_title || "").toLowerCase()}|${(r.company || "").toLowerCase()}`, r);
    return (a: Application) => map.get(`${(a.title || "").toLowerCase()}|${(a.company || "").toLowerCase()}`);
  }, [receipts]);

  // Stable "now" for the mount: Date.now() inside useMemo violates react-hooks/purity
  // (the memo must be a pure function of its deps). One timestamp per view is exactly
  // right for a "this week" counter anyway.
  const [now] = useState(() => Date.now());

  // Everything downstream reads the edited status, so the metrics strip and the
  // "Prep for this" affordance move the moment the user marks a reply.
  const rows = useMemo(
    () => applications.map((a) => (statusEdits[a.id] ? { ...a, status: statusEdits[a.id] } : a)),
    [applications, statusEdits]
  );

  const metrics = useMemo(() => {
    const week = rows.filter((a) => now - new Date(a.date_applied).getTime() < 7 * 86400000).length;
    const responses = rows.filter((a) => RESPONSE_STATUSES.has(a.status)).length;
    return {
      total: rows.length,
      week,
      responses,
      rate: rows.length ? Math.round((responses / rows.length) * 100) : 0,
    };
  }, [rows, now]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Application[]>();
    for (const a of rows) {
      const k = dayKey(a.date_applied);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  return (
    /* .hd-history carries the day wallpaper + the paper/ink vocabulary — see
       "HISTORY — PAPER & INK" in globals.css. Nothing here is styled locally,
       so /preview/history-chips shows exactly what the dashboard ships. */
    <div className="hd-history space-y-7">
      <div>
        <p className="hd-eyebrow">The record</p>
        <h1 className="hd-hist-display mt-2">
          Every application, <em className="italic">kept</em>.
        </h1>
        <p className="hd-hist-sub mt-2.5 max-w-xl leading-relaxed">
          Links, status and proof of submission — what we sent, and when we sent it.
        </p>
      </div>

      {/* Metrics strip. One tile inverts (the popup's rule: black digits on
          white, white digits on black) so the row reads as a composition
          instead of four equal boxes. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total applied", value: metrics.total },
          { label: "This week", value: metrics.week },
          { label: "Responses", value: metrics.responses },
          { label: "Response rate", value: `${metrics.rate}%` },
        ].map((m, i) => (
          <div
            key={m.label}
            className={["p-4 sm:p-5", i === 0 ? "hd-tile-ink rounded-2xl" : "hd-sheet"].join(" ")}
          >
            <div className="hd-hist-num">{m.value}</div>
            <div className="hd-eyebrow mt-2.5">{m.label}</div>
          </div>
        ))}
      </div>

      {statusError && (
        <p className="text-[12px] text-red" role="alert">{statusError}</p>
      )}

      {/* Couldn't submit these (hand-backs) */}
      {handbacks.length > 0 && (
        <div id="handbacks" className="scroll-mt-24 space-y-1.5">
          {handbacks.map((h) => {
            const pct = handbackProgress(h.steps_done);
            return (
              // The whole row is the affordance. No banner above it, no explanation
              // beside it — a red dot, and the rest appears only if you look (Igor,
              // 09-21: "чтоб он не видел кучу текста и каких то разных уведомлений").
              <div key={h.id} className="group relative">
                {/* Hover card, above the row so it never covers what you're pointing at. */}
                <div
                  className="hd-sheet pointer-events-none absolute -top-2 left-0 z-20 w-72
                    -translate-y-full p-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  role="tooltip"
                >
                  <p className="hd-eyebrow hd-eyebrow-ink">Finish this one by hand</p>
                  <p className="hd-hist-sub mt-1.5 text-[12px] leading-snug" title={h.reason}>
                    {userReason(h.reason)}
                  </p>
                  {pct !== null && (
                    <>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      {/* Screens, not a guess: we counted the ones we completed and we
                          know one is left. Never claim to know what's behind it. */}
                      <p className="mt-1 text-[11px] text-text2 tabular-nums">
                        {pct}% done — {h.steps_done} {h.steps_done === 1 ? "screen" : "screens"} filled, one left
                      </p>
                    </>
                  )}
                </div>

                <div className="hd-sheet hd-sheet-lift flex items-center gap-3 px-4 py-3.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red" aria-hidden />
                  <div className="min-w-0 flex-1">
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hd-hist-title hover:text-accent transition"
                      >
                        {h.job_title || "Application"}
                      </a>
                    ) : (
                      <span className="hd-hist-title">{h.job_title || "Application"}</span>
                    )}
                    {h.company ? <span className="hd-hist-sub"> · {h.company}</span> : null}
                  </div>
                  {pct !== null && (
                    <span className="shrink-0 text-[11px] text-text2 tabular-nums opacity-0
                      transition-opacity group-hover:opacity-100">
                      {pct}%
                    </span>
                  )}
                  {/* Re-queued rows say so: the job is back at the head of the next
                      run, and without this the row looks exactly as untouched as
                      before the user answered it. */}
                  {(requeued.has(h.id) || h.requeued_at) && (
                    <span className="shrink-0 rounded-md bg-accent/12 px-2 py-0.5 text-[11px]
                      font-medium text-accent">
                      queued
                    </span>
                  )}
                  {/* The questions that blocked it — answer them here instead of
                      redoing the whole form on the employer's site. Only when we
                      actually captured them AND they aren't answered yet. */}
                  {!!questionsFor(h).length && !requeued.has(h.id) && !h.requeued_at && (
                    <button
                      onClick={() => setAnswering((cur) => (cur === h.id ? null : h.id))}
                      data-testid="handback-answer-open"
                      className="shrink-0 rounded-md border border-accent/40 bg-accent/8 px-2 py-0.5
                        text-[11px] font-medium text-accent transition hover:bg-accent/15"
                    >
                      {answering === h.id ? "Close" : `Answer ${questionsFor(h).length}`}
                    </button>
                  )}
                  {/* Appears on hover: a list that never drains stops being read. */}
                  <button
                    onClick={() => markHandbackDone(h.id)}
                    className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px]
                      font-medium text-text2 opacity-0 transition hover:text-text group-hover:opacity-100"
                  >
                    Done
                  </button>
                </div>

                {answering === h.id && (
                  <HandbackAnswers
                    handbackId={h.id}
                    questions={questionsFor(h)}
                    onDone={(wasRequeued) => {
                      setAnswering(null);
                      if (wasRequeued) {
                        setRequeued((prev) => new Set(prev).add(h.id));
                      } else {
                        // No pool row behind it (a native walk) — the answers are saved
                        // but nothing will pick the job up, so say nothing about a queue
                        // and leave the row as the to-do it still is.
                        markHandbackDone(h.id);
                      }
                      loadHandbacks();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Applications by day */}
      {byDay.length === 0 ? (
        <div className="hd-sheet p-10 text-center">
          <p className="hd-eyebrow hd-eyebrow-ink">Nothing here yet</p>
          <p className="hd-hist-sub mt-2">
            Start a campaign and every application lands here, grouped by day.
          </p>
        </div>
      ) : (
        byDay.map(([day, apps]) => (
          <div key={day}>
            <div className="hd-hist-day">
              <h2 className="hd-eyebrow hd-eyebrow-ink">{prettyDay(day)}</h2>
              <span className="hd-eyebrow tabular-nums order-last">
                {apps.length} application{apps.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="hd-sheet divide-y divide-border overflow-hidden">
              {apps.map((a) => {
                const r = receiptFor(a);
                const isOpen = expanded.has(a.id);
                return (
                  <div key={a.id}>
                    {/* The whole row toggles the detail — same affordance as a job row in
                        Job Listings. Inner links/buttons stop propagation. */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpand(a.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(a.id); } }}
                      className="px-4 py-3.5 flex items-center gap-3 flex-wrap cursor-pointer hover:bg-surface2/45 transition"
                      data-testid="history-row"
                    >
                      <span
                        className={["inline-block w-2 h-2 rounded-full shrink-0",
                          r ? (r.verified ? "bg-emerald-500" : "bg-amber-400") : "bg-border"].join(" ")}
                        title={r ? (r.verified ? `confirmed (${r.signal})` : "submitted — confirmation page not detected") : "no receipt captured"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="hd-hist-title truncate">
                          {a.title} <span className="hd-hist-sub">@ {a.company}</span>
                        </div>
                        <div className="hd-eyebrow mt-1 tabular-nums">
                          {platformName(a.platform)}
                          {" · "}
                          {new Date(a.date_applied).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <StatusPicker
                        status={a.status}
                        onPick={(next) => setStatus(a.id, next, a.status)}
                      />
                      {/* An interview is the one row where the next move isn't reading the
                          record — it's getting ready. Put that first, and loudly. */}
                      {INTERVIEW_STATUSES.has(a.status) && (
                        <Link
                          href={`/dashboard/interview/${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-accent-hover"
                        >
                          Prep for this
                        </Link>
                      )}
                      {/* Hidden while open — the expanded record carries its own
                          "Job posting" chip, and two of the same link on one row
                          is noise. */}
                      {a.link && !isOpen && (
                        <a href={a.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="hd-chip hd-chip-ghost shrink-0">
                          <IconExternal />
                          job post
                        </a>
                      )}
                      {r?.shot && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenShot(openShot === r.shot ? null : r.shot!); }}
                          className="hd-chip hd-chip-ghost shrink-0"
                        >
                          <IconEye />
                          {openShot === r.shot ? "hide proof" : "view proof"}
                        </button>
                      )}
                      <svg
                        className={["w-3.5 h-3.5 shrink-0 text-text2 transition-transform", isOpen ? "rotate-180" : ""].join(" ")}
                        viewBox="0 0 20 20" fill="currentColor" aria-hidden
                      >
                        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                      {r?.shot && openShot === r.shot && (
                        <div className="w-full mt-2 rounded-lg border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.shot} alt="Submission confirmation" className="w-full" />
                        </div>
                      )}
                    </div>
                    {isOpen && <ApplicationDetail a={a} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** The status chip, made pressable: the user's only channel for "the employer
 *  answered". The automatic one (a shared inbox matched by company name across
 *  every user) stays off, and the honest replacement is the person who already
 *  has the reply in their own mail.
 *
 *  Sits inside a row that is itself a button, so every handler stops propagation —
 *  picking a status must never also expand the record. */
function StatusPicker({ status, onPick }: { status: string; onPick: (next: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${statusLabel(status)}. Change it.`}
        data-testid="status-picker"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={["hd-chip rounded-full py-1 text-[11px]", statusTone(status)].join(" ")}
      >
        {statusLabel(status)}
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden
          className={["w-3 h-3 opacity-60 transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div role="listbox" aria-label="Application status"
          className="hd-menu absolute right-0 top-full mt-1.5 z-20 w-56 rounded-xl border border-border bg-surface p-1">
          {SETTABLE.map((opt) => {
            // interview_invite and interview are the same thing to a human, so the
            // legacy value must still light up the "Interview" row as current.
            const current = opt.value === status
              || (opt.value === "interview" && status === "interview_invite");
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={current}
                onClick={(e) => { e.stopPropagation(); setOpen(false); if (!current) onPick(opt.value); }}
                className="hd-menu-item w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left"
              >
                <span className="w-3.5 shrink-0 text-accent">
                  {current && <IconCheck />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-text">{opt.label}</span>
                  <span className="block text-[11px] text-text2">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Expanded record of one application: everything we durably stored about the submit.
 *  Documents (cover letter / tailored resume) exist only for applications where the AI
 *  produced them — older rows honestly say so instead of showing an empty box. */
function ApplicationDetail({ a }: { a: Application }) {
  const hasDocs = !!(a.cover_letter || a.tailored_resume || a.resume_pdf_url);
  return (
    <div className="px-4 pb-5 pt-3 bg-surface2/35 hd-detail-in" data-testid="history-detail">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {a.link ? (
          <a href={a.link} target="_blank" rel="noopener noreferrer"
            className="hd-chip hd-rise" style={{ animationDelay: "40ms" }}>
            <IconExternal />
            Job posting
          </a>
        ) : (
          <span className="hd-hist-sub text-[12px]">No job link saved for this one.</span>
        )}
        {a.resume_pdf_url && (
          <a href={a.resume_pdf_url} target="_blank" rel="noopener noreferrer"
            className="hd-chip hd-rise" style={{ animationDelay: "90ms" }}>
            <IconDocument />
            Résumé PDF we submitted
          </a>
        )}
      </div>
      {a.cover_letter && (
        <DocBlock label="Cover letter we sent" text={a.cover_letter} delay={140} kind="letter" />
      )}
      {a.tailored_resume && (
        <DocBlock label="Tailored resume" text={a.tailored_resume} delay={190} kind="resume" />
      )}
      {!hasDocs && (
        <p className="hd-hist-sub text-[12px] leading-relaxed hd-rise" style={{ animationDelay: "90ms" }}>
          No documents stored for this application — it went through with your standard resume,
          before per-job documents were kept. Newer applications include the cover letter and the
          exact résumé PDF submitted.
        </p>
      )}
    </div>
  );
}

function DocBlock({ label, text, delay = 0, kind = "resume" }: {
  label: string; text: string; delay?: number;
  /** A letter is prose and gets the serif; a résumé keeps a fixed pitch because
   *  its columns are aligned with spaces. */
  kind?: "letter" | "resume";
}) {
  // Copy → "Copied" for a beat: the feedback lives on the button itself, no toast.
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="mb-3 last:mb-0 hd-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="hd-doc-label">
        <span className="hd-eyebrow hd-eyebrow-ink order-first">{label}</span>
        <button onClick={copy} aria-live="polite"
          className={["order-last hd-chip", copied ? "hd-chip-done" : ""].join(" ")}>
          {copied
            ? <span className="hd-copied-pop inline-flex"><IconCheck /></span>
            : <IconCopy />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={[
        "hd-doc hd-scroll max-h-80 overflow-y-auto p-4 sm:p-5",
        kind === "letter" ? "hd-doc-letter" : "hd-doc-mono",
      ].join(" ")}>
        {text}
      </pre>
    </div>
  );
}

/* ── Chip icons: 20×20 stroke glyphs, sized/colored by the .hd-chip recipe.
   The external-link arrow carries .hd-chip-ext so hover slips it out of frame. ── */
function IconExternal() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4.5H5.5A1.5 1.5 0 0 0 4 6v8.5A1.5 1.5 0 0 0 5.5 16H14a1.5 1.5 0 0 0 1.5-1.5V11" />
      <path className="hd-chip-ext" d="M12 4h4v4M16 4l-6.5 6.5" />
    </svg>
  );
}
function IconDocument() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3H6.5A1.5 1.5 0 0 0 5 4.5v11A1.5 1.5 0 0 0 6.5 17h7a1.5 1.5 0 0 0 1.5-1.5V6l-3-3Z" />
      <path d="M12 3v3h3M8 10.5h4M8 13.5h4" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 10s3-5.5 7.5-5.5S17.5 10 17.5 10s-3 5.5-7.5 5.5S2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.2" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 10.5l4 4L16 6" />
    </svg>
  );
}
