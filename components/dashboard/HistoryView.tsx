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

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Application } from "@/lib/types";
import { PLATFORMS, JOB_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { apiPatch, apiPost, type StatsResponse } from "@/lib/api";
import { handbackAge, handbackExpired } from "@/lib/handbacks/freshness";
import { useNowMs, useHandbacks, useHiddenHandbacks, handbackProgress, type Handback } from "@/components/dashboard/useHandbacks";
import HandbackAnswers from "@/components/dashboard/HandbackAnswers";
import PersonalQuestions from "@/components/dashboard/PersonalQuestions";
import AnswerRow from "@/components/dashboard/AnswerRow";
import HistoryInsights from "@/components/dashboard/HistoryInsights";
import PosterPanel from "@/components/dashboard/PosterPanel";
import { buildPlaceChips, placeText } from "@/lib/history/places";
import DropCameo from "@/components/landing/DropCameo";

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

/** How many hand-backs the list shows before it folds — a glance, not a scroll. */
const FOLD_AT = 5;

const userReason = (raw: string) => REASON_MAP.find(([re]) => re.test(raw))?.[1] ?? "we couldn't finish this one automatically";

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
  statsOverride,
}: {
  applications: Application[];
  /** Injected by /preview/history-chips so the picker works without a session.
   *  Real dashboard leaves it undefined and the live PATCH is used. */
  onSetStatus?: (id: string, status: string) => Promise<void>;
  /** Same trick for the hand-back rows: the live ones come from /handbacks, which
   *  needs a session, so a design review would otherwise never see them. */
  handbacksOverride?: Handback[];
  /** Same trick for the run numbers the Insights panel shows. */
  statsOverride?: StatsResponse;
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
  // The hand-back list: folded to FOLD_AT rows by default once it is longer than that,
  // and hidden outright by the ✕ until a hand-back it hasn't seen shows up.
  const [handbacksOpen, setHandbacksOpen] = useState(false);
  const { allHidden: handbacksHidden, hide: hideHandbacks } = useHiddenHandbacks(handbacks);
  // Minute clock for the stale treatment (0 before mount = everything fresh).
  const nowMs = useNowMs();
  const handbacksFold = handbacks.length > FOLD_AT;
  // The row being answered is never folded away: a new hand-back arriving on the 30s
  // poll pushes the list down a slot, and slicing the form out would drop what was typed.
  const shownHandbacks = handbacksFold && !handbacksOpen
    ? handbacks.filter((h, i) => i < FOLD_AT || h.id === answering)
    : handbacks;
  // The place chip the list is narrowed to ("all" = the whole record).
  const [where, setWhere] = useState("all");

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

  // "The extension updated — try this one again." The person's call, never automatic:
  // they may already have submitted it by hand, and a second submit is worse than a
  // form left waiting. Same stamp as answering, so the next run picks it up.
  const retryHandback = async (id: string) => {
    setRequeued((prev) => new Set(prev).add(id)); // optimistic: it's their click
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      await apiPost(`/handbacks/${id}/retry`, session.access_token, {});
    } catch {
      setRequeued((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    loadHandbacks();
  };

  // Deep link: ?app=<id> (Drop's "Open this application" card) opens that record and
  // scrolls to it. Read from window.location, like Settings' ?tab=, to avoid a
  // useSearchParams Suspense boundary. A push to this same page keeps the view mounted
  // and only re-renders it with fresh `applications`, so the link is re-read then too;
  // `linked` stops a later refresh from yanking the page back to a card already shown.
  const linked = useRef<string | null>(null);
  const [focusApp, setFocusApp] = useState<string | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const id = new URLSearchParams(window.location.search).get("app");
      if (!id || id === linked.current || !applications.some((a) => a.id === id)) return;
      linked.current = id;
      setWhere("all");
      setExpanded((prev) => new Set(prev).add(id));
      setFocusApp(id);
    });
    return () => cancelAnimationFrame(raf);
  }, [applications]);
  // Scrolled after the open record has rendered. A jump, like an anchor link: a smooth
  // scroll over a page still laying out its panels stopped short of the row on phones.
  useEffect(() => {
    if (focusApp) document.getElementById(`app-${focusApp}`)?.scrollIntoView({ block: "start" });
  }, [focusApp]);

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

  // Everything downstream reads the edited status, so the metrics strip and the
  // "Prep for this" affordance move the moment the user marks a reply.
  const rows = useMemo(
    () => applications.map((a) => (statusEdits[a.id] ? { ...a, status: statusEdits[a.id] } : a)),
    [applications, statusEdits]
  );

  // Where the jobs were: Remote · each city · Hybrid in that city — built from the
  // record itself (lib/history/places.ts). Filtering keeps the day grouping, because
  // "what we sent, when" is what this page is; a chip only narrows it.
  const places = useMemo(() => buildPlaceChips(rows), [rows]);
  // A chip can vanish under a selection (live data moved) — fall back to everything.
  const activeWhere = places.chips.some((c) => c.key === where) ? where : "all";

  const byDay = useMemo(() => {
    const groups = new Map<string, Application[]>();
    for (const a of rows) {
      if (activeWhere !== "all" && places.chipOf(a) !== activeWhere) continue;
      const k = dayKey(a.date_applied);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows, places, activeWhere]);

  return (
    /* .hd-history carries the day wallpaper + the paper/ink vocabulary — see
       "HISTORY — PAPER & INK" in globals.css. Nothing here is styled locally,
       so /preview/history-chips shows exactly what the dashboard ships. */
    <div className="hd-history space-y-7">
      {/* Headline only — the eyebrow and the sub-line said the same thing the poster
          below shows (Igor, 10-08: убрать). */}
      <h1 className="hd-hist-display">
        Every application, <em className="italic">kept</em>.
      </h1>

      {/* The banner: a poster panel whose plate is one of OUR onboarding renders
          put through brand-visuals/skills-photo.py (blurred, darkened) and, for
          the day, regraded warm first — the Flow-style photographic ground Igor
          asked for, in our own art. It earns its place by explaining the one
          thing about this screen that isn't obvious: a row opens into the exact
          documents we sent. */}
      <div className="relative">
        {/* Drop stands behind the panel's top edge: the panel is painted over his feet, so he
            reads as standing behind the block. Desktop only; phones keep the plain panel. The bottom 72px of him sit behind the block, so the desk legs are hidden and only the desk top shows above it. */}
        <DropCameo pose="at-desk" width={150} enter="up" className="hidden md:block absolute right-10 bottom-[calc(100%-72px)]" />
      <PosterPanel
        title={<>We kept <em className="italic">everything</em> we sent.</>}
        image="/bg/poster-history-day.jpg"
        imageNight="/bg/poster-history-night.jpg"
        testId="history-poster"
      >
        <div className="mt-5 space-y-2">
          {[
            ["Job posting", "the exact listing we applied to"],
            ["Cover letter", "the letter, word for word"],
            ["Résumé PDF", "the file the employer received"],
          ].map(([k, v]) => (
            <div key={k} className="hd-poster-pair">
              <span className="hd-pill hd-pill-key">{k}</span>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="hd-poster-arrow" aria-hidden>
                <path d="M4 10h11M11 6l4 4-4 4" />
              </svg>
              <span className="hd-pill">{v}</span>
            </div>
          ))}
        </div>
      </PosterPanel>
      </div>

      {/* How much · when · today · where they went. Four blocks, four questions,
          every number computed from the record we already store. */}
      <HistoryInsights rows={rows} statsOverride={statsOverride} />

      {statusError && (
        <p className="text-[12px] text-red" role="alert">{statusError}</p>
      )}

      {/* Couldn't submit these (hand-backs). Past FOLD_AT rows the list folds to its
          first FOLD_AT, and the ✕ puts the batch away until a new one arrives (Igor,
          10-08: «сворачивался когда больше 5ти незаконченных … и крестик чтоб убрать»).
          The header is the same ruled ledger line as a day below — a place for the two
          controls, not a banner. */}
      {/* Circumstance questions first: one answer here can free several rows below. */}
      {!handbacksOverride && <PersonalQuestions onAnswered={loadHandbacks} />}

      {handbacks.length > 0 && !handbacksHidden && (
        <div id="handbacks" className="scroll-mt-24" data-testid="handbacks">
          <div className="hd-hist-day">
            <h2 className="hd-eyebrow hd-eyebrow-ink">Unfinished</h2>
            <span className="hd-eyebrow tabular-nums order-last">
              {handbacks.length} application{handbacks.length === 1 ? "" : "s"}
            </span>
            <span className="order-last -mr-1.5 flex items-center gap-0.5">
              {handbacksFold && (
                <button
                  type="button"
                  onClick={() => setHandbacksOpen((o) => !o)}
                  aria-expanded={handbacksOpen}
                  aria-controls="handback-rows"
                  aria-label={handbacksOpen ? "Collapse the list" : "Show the whole list"}
                  className="hd-icon-btn"
                  data-testid="handbacks-fold"
                >
                  <IconChevron open={handbacksOpen} />
                </button>
              )}
              <button
                type="button"
                onClick={() => { setAnswering(null); hideHandbacks(); }}
                aria-label="Hide this list"
                title="Hide — it comes back when a new one needs you"
                className="hd-icon-btn"
                data-testid="handbacks-hide"
              >
                <IconClose />
              </button>
            </span>
          </div>
          <div id="handback-rows" className="space-y-1.5">
          {shownHandbacks.map((h, i) => {
            const pct = handbackProgress(h.steps_done);
            // Older than a day = the employer's form has reset and kept nothing of what
            // was filled (ZR's lk= link can even open an EMPTY pane once the job rotates
            // off that results page — Igor, 10-08). The row stays, muted: a record with
            // a working link and a Done, never a to-do that blinks forever.
            const isQueued = requeued.has(h.id) || !!h.requeued_at;
            const expired = nowMs && !isQueued ? handbackExpired(h.created_at, nowMs) : false;
            const age = nowMs ? handbackAge(h.created_at, nowMs) : null;
            // Rows the fold just let out rise in one after another, so opening the
            // list reads as the list growing rather than the page jumping.
            const revealed = handbacksOpen && i >= FOLD_AT;
            return (
              // The whole row is the affordance. No banner above it, no explanation
              // beside it — a red dot, and the rest appears only if you look (Igor,
              // 09-21: "чтоб он не видел кучу текста и каких то разных уведомлений").
              <div
                key={h.id}
                className={["group relative", revealed ? "hd-rise" : ""].join(" ")}
                style={revealed ? { animationDelay: `${Math.min(i - FOLD_AT, 10) * 30}ms` } : undefined}
              >
                {/* Hover card, above the row so it never covers what you're pointing at. */}
                <div
                  className="hd-sheet pointer-events-none absolute -top-2 left-0 z-20 w-72
                    -translate-y-full p-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  role="tooltip"
                >
                  <p className="hd-eyebrow hd-eyebrow-ink">
                    {expired ? "This one went stale" : "Finish this one by hand"}
                  </p>
                  <p className="hd-hist-sub mt-1.5 text-[12px] leading-snug" title={h.reason}>
                    {userReason(h.reason)}
                  </p>
                  {expired && (
                    <p className="hd-hist-sub mt-1.5 text-[12px] leading-snug">
                      A day or more passed, and the employer&apos;s form keeps nothing that
                      long — opening it starts over. Still interested? Open it and apply
                      fresh; otherwise press Done to clear it.
                    </p>
                  )}
                  {h.newer_build && !h.requeued_at && !requeued.has(h.id) && (
                    <p className="hd-hist-sub mt-1.5 text-[12px] leading-snug">
                      HireDrop has updated since — Try again sends it back to your next run.
                      Already sent it yourself? Press Done.
                    </p>
                  )}
                  {pct !== null && (
                    <>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      {/* Screens, not a guess: we counted the ones we completed and we
                          know one is left. Never claim to know what's behind it. */}
                      <p className="mt-1 text-[11px] text-text2 tabular-nums">
                        {expired
                          ? `${h.steps_done} ${h.steps_done === 1 ? "screen" : "screens"} were filled before the form reset`
                          : `${pct}% done — ${h.steps_done} ${h.steps_done === 1 ? "screen" : "screens"} filled, one left`}
                      </p>
                    </>
                  )}
                </div>

                <div className={["hd-sheet hd-sheet-lift flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5",
                  expired ? "opacity-70" : ""].join(" ")}>
                  {/* The red dot BLINKS (Igor 09-23: «красные кнопочки должны
                      мигать») — a hand-back is the one row on this screen that
                      needs a human, and a still dot in a long list never gets
                      noticed. Pulse + a ring that expands out of it; both stop
                      under prefers-reduced-motion. */}
                  {expired
                    ? <span className="h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
                    : <span className="hd-alert-dot shrink-0" aria-hidden />}
                  <div className="min-w-0 flex-1 basis-[calc(100%-1.25rem)] sm:basis-auto">
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
                  {age && (
                    <span className="shrink-0 text-[11px] text-text2 tabular-nums">{age}</span>
                  )}
                  {pct !== null && !expired && (
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
                  {!!questionsFor(h).length && !isQueued && (
                    <button
                      onClick={() => setAnswering((cur) => (cur === h.id ? null : h.id))}
                      data-testid="handback-answer-open"
                      className="hd-answer-cta shrink-0 rounded-md border border-accent/40 bg-accent/8 px-2 py-0.5
                        text-[11px] font-medium text-accent transition hover:bg-accent/15"
                    >
                      {answering === h.id ? "Close" : `Answer ${questionsFor(h).length}`}
                    </button>
                  )}
                  {h.newer_build && !isQueued && (
                    <button
                      onClick={() => retryHandback(h.id)}
                      data-testid="handback-retry"
                      className="hd-answer-cta shrink-0 rounded-md border border-accent/40 bg-accent/8 px-2 py-0.5
                        text-[11px] font-medium text-accent transition hover:bg-accent/15"
                    >
                      Try again
                    </button>
                  )}
                  {/* The way IN — the one thing the row is FOR. A title that happens to
                      be a link is not an affordance: Igor opened a 95% row and found
                      nothing to click but Done (10-08). Always visible. */}
                  {h.url && !isQueued && (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="handback-open-form"
                      className={[expired ? "" : "hd-answer-cta", // the pulse means "needs you NOW" — a stale record sits still
                        "shrink-0 rounded-md border border-accent/40 bg-accent/8 px-2 py-0.5",
                        "text-[11px] font-medium text-accent transition hover:bg-accent/15"].join(" ")}
                    >
                      {expired ? "Open posting ↗" : "Finish form ↗"}
                    </a>
                  )}
                  {/* Hover-only while fresh (a list that never drains stops being read);
                      always visible once stale — Done is the honest exit then. */}
                  <button
                    onClick={() => markHandbackDone(h.id)}
                    className={["shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px]",
                      "font-medium text-text2 transition hover:text-text",
                      expired ? "" : "opacity-0 group-hover:opacity-100"].join(" ")}
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
          {handbacksFold && (
            <div className="mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => setHandbacksOpen((o) => !o)}
                aria-expanded={handbacksOpen}
                aria-controls="handback-rows"
                className="hd-chip hd-chip-ghost"
                data-testid="handbacks-more"
              >
                {handbacksOpen ? "Show less" : `Show ${handbacks.length - FOLD_AT} more`}
                <IconChevron open={handbacksOpen} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Where — narrows the list below to one place. Hidden when every row sits
          in one group: a single chip is not a choice. */}
      {places.chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by where the job is"
          data-testid="history-places">
          {places.chips.map((c) => {
            const on = c.key === activeWhere;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setWhere(c.key)}
                aria-pressed={on}
                title={c.title}
                className={["hd-chip hd-place-chip", on ? "is-on" : ""].join(" ")}
              >
                {c.label}
                <span className="hd-chip-n">{c.n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Applications by day */}
      {rows.length === 0 ? (
        <div className="hd-sheet p-10 text-center">
          <DropCameo pose="waving" width={120} enter="up" className="mx-auto mb-4" />
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
                  <div key={a.id} id={`app-${a.id}`} className="scroll-mt-24">
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
                      {/* On a phone the text keeps most of the row and the controls wrap
                          under it — otherwise the title truncates to a word and the
                          platform · place · time line breaks after every token. */}
                      <div className="min-w-[58%] flex-1 sm:min-w-0">
                        <div className="hd-hist-title truncate">
                          {a.title} <span className="hd-hist-sub">@ {a.company}</span>
                        </div>
                        <div className="hd-eyebrow mt-1 tabular-nums">
                          {platformName(a.platform)}
                          {placeText(a) && <>{" · "}{placeText(a)}</>}
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
      {!!a.form_answers?.length && <AnswersBlock answers={a.form_answers} delay={120} />}
      {a.cover_letter && (
        <DocBlock label="Cover letter we sent" text={a.cover_letter} delay={140} kind="letter" />
      )}
      {!a.cover_letter && hasDocs && (
        // Name the reason instead of leaving a gap where a letter used to be. A letter is
        // written only when the employer's form actually asks for one, and most don't —
        // measured 2026-09-23, Indeed's apply wizard has never shown a cover-letter step.
        // Until now this card displayed a letter on every application, which claimed the
        // employer had read something they were never sent.
        <p className="text-[12px] text-text2 hd-rise mb-3" style={{ animationDelay: "140ms" }}>
          No cover letter — this employer&apos;s application form didn&apos;t ask for one.
        </p>
      )}
      {a.tailored_resume && (
        <DocBlock label="Tailored resume" text={a.tailored_resume} delay={190} kind="resume" />
      )}
      {!hasDocs && (
        <p className="hd-hist-sub text-[12px] leading-relaxed hd-rise" style={{ animationDelay: "90ms" }}>
          No documents stored for this application — it went through with your standard resume,
          before per-job documents were kept. Newer applications include the exact résumé PDF
          submitted, and the cover letter whenever the employer asked for one.
        </p>
      )}
    </div>
  );
}

/** One section of the expanded record, folded by default: a long wall of letter, résumé and
 *  answers buried the one line a person came for. The header names what is inside
 *  and how much, so the record reads as a table of contents before anything is opened.
 *  Copy sits beside the toggle, not inside it, so copying never folds the section. */
function Fold({ label, meta, copyText, delay = 0, testId, children }: {
  label: string; meta: ReactNode; copyText: string; delay?: number; testId?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  // Copy → "Copied" for a beat: the feedback lives on the button itself, no toast.
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = () => {
    navigator.clipboard.writeText(copyText).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="hd-fold hd-rise" style={{ animationDelay: `${delay}ms` }} data-testid={testId}>
      <div className="flex items-center gap-2.5">
        <button type="button" aria-expanded={open} aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)} className="hd-fold-toggle">
          <span className="hd-fold-chev"><IconChevron open={open} /></span>
          <span className="hd-eyebrow hd-eyebrow-ink">{label}</span>
          <span className="hd-chip-n inline-flex items-center gap-1.5">{meta}</span>
          <span className="hd-fold-rule" aria-hidden />
        </button>
        {/* On a phone the label stays readable and Copy shrinks to its glyph. */}
        <button onClick={copy} aria-live="polite"
          className={["hd-chip shrink-0", copied ? "hd-chip-done" : ""].join(" ")}>
          {copied
            ? <span className="hd-copied-pop inline-flex"><IconCheck /></span>
            : <IconCopy />}
          <span className="max-sm:sr-only">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {open && <div id={bodyId} className="mt-1.5 mb-2 hd-detail-in">{children}</div>}
    </div>
  );
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** What the employer's form asked and what we answered in the person's name, so they
 *  walk into the interview knowing it (e.g. "willing to work 5 days in the office: Yes").
 *  Our answers carry the marker (.hd-ours), so the eye finds what was said on their
 *  behalf; one they correct loses it, because from then on it is their own answer.
 *  Each answer can be changed; the change is remembered for the next forms (AnswerRow). */
function AnswersBlock({ answers: sent, delay = 0 }: { answers: { q: string; a: string }[]; delay?: number }) {
  const [changed, setChanged] = useState<Record<number, string>>({});
  const answers = sent.map((x, i) => (i in changed ? { ...x, a: changed[i] } : x));
  return (
    <Fold label="What we answered for you" delay={delay} testId="history-answers"
      meta={<><span className="hd-ours-dot" aria-hidden />{plural(answers.length, "answer")}</>}
      copyText={answers.map((x) => `${x.q}\n${x.a}`).join("\n\n")}>
      <dl className="hd-doc hd-scroll max-h-80 overflow-y-auto divide-y divide-border px-4 sm:px-5">
        {answers.map((x, i) => (
          <AnswerRow key={i} q={x.q} a={x.a} ours={!(i in changed)}
            onChanged={(a) => setChanged((prev) => ({ ...prev, [i]: a }))} />
        ))}
      </dl>
    </Fold>
  );
}

function DocBlock({ label, text, delay = 0, kind = "resume" }: {
  label: string; text: string; delay?: number;
  /** A letter is prose and gets the serif; a résumé keeps a fixed pitch because
   *  its columns are aligned with spaces. */
  kind?: "letter" | "resume";
}) {
  return (
    <Fold label={label} meta={plural(wordCount(text), "word")} copyText={text} delay={delay}>
      <pre className={[
        "hd-doc hd-scroll max-h-80 overflow-y-auto p-4 sm:p-5",
        kind === "letter" ? "hd-doc-letter" : "hd-doc-mono",
      ].join(" ")}>
        {text}
      </pre>
    </Fold>
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
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={["transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}>
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M6 6l8 8M14 6l-8 8" />
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
