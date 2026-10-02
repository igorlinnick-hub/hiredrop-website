"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet, apiPost, type CampaignStatusResponse } from "@/lib/api";
import { checkExtensionPresent } from "@/components/dashboard/StartReadiness";
import { readTapBaseline, markTapSessionStart, clearTapBaseline, startTapRun } from "@/lib/tap-run";
import { stopCampaignEverywhere } from "@/lib/campaign/stop";
import { PLATFORMS } from "@/lib/constants";

/**
 * The arch — where a swipe sitting stays visible after you leave the deck.
 *
 * The confusion it answers (Igor, 09-19): you swipe a stack on /dashboard/tap, walk back
 * to the dashboard, and a separate automation window is suddenly driving employer sites.
 * Same executor as Auto, so it READS as "it switched to Auto" — and the deck, the only
 * surface that knew about your batch, is behind you. Nothing on the dashboard said "these
 * are the cards YOU picked, here's how far through them we are."
 *
 * So the batch gets a surface that follows you out of the deck: a half-round dock at the
 * bottom of every dashboard route, with the arc counting your own swipes down. It is not
 * a badge — it carries the one action each state needs, in the state where it's needed:
 *
 *   applying   → the count, what's being worked on, and Stop;
 *   stranded   → "4 you approved aren't sent" + Apply them now. THE point of the dock.
 *                Approved rows survive a closed browser and nothing picks them up until
 *                a Tap run starts again; the fix belongs here, not in a reminder that
 *                tells you about a dead end without offering the way out;
 *   caught up  → "all N sent", then it retires itself.
 *
 * And when there is no swiped batch but an Auto run is live, the same dock carries the
 * run's live counter (Igor 09-30: "при лайв кампейне счётчик должен идти на главной"):
 * the arc is today's sends against today's cap, the number bumps on every new send, the
 * line under it splits today by platform. Both numbers are /campaign/status — the dock
 * never counts on its own. A swiped batch outranks it: that is the more specific news.
 *
 * Every number is the server's (GET /campaign/queue, GET /campaign/status) — the phone
 * swipes the same pool, so the dock is right on a device that has no extension at all.
 * `done` is a difference between two server numbers against a stamp the deck writes (see
 * lib/tap-run.ts), never an inference.
 */

const POLL_MS = 8000;
const DISMISS_KEY = "hd_tap_dock_dismissed";
// Hiding the live counter holds for that run only — keyed by its started_at, so the
// next Start brings it back.
const LIVE_DISMISS_KEY = "hd_live_dock_dismissed";
// The backend's admin "unlimited" sentinel is 10M; anything that large is not a cap
// worth drawing an arc against.
const UNLIMITED_AT = 1_000_000;
// A finished batch says so, then gets out of the way. Long enough to read, short
// enough that it isn't furniture.
const DONE_LINGER_MS = 30_000;

type QueueResponse = {
  queue: { id: string; title: string; company: string; platform: string }[];
  ready: number;
  waiting: number;
  held_by_caps: number;
  done_today: number;
};

type Snapshot = {
  waiting: number;
  held: number;
  running: boolean;
  doneToday: number;
  next: { title: string; company: string; platform: string } | null;
  // Auto-run counter. Optional so the tap-batch demos stay as they were.
  dailyLimit?: number | null;
  platformCounts?: Record<string, number>;
  startedAt?: string | null;
};

export type DockDemo = Snapshot & { done: number };

// Two shapes on the table (Igor 09-19, "possibly a half-round block"):
//   "dome"  — a true half-round crown carrying the gauge, sitting on a flat bar.
//             At dashboard width this is the only way a half-circle reads as a circle.
//   "arch"  — the whole block crowned; at 560px wide it reads as a stadium pill.
export type DockShape = "dome" | "arch";

export default function TapProgressDock(
  { demo, shape = "dome" }: { demo?: DockDemo; shape?: DockShape } = {},
) {
  const [snap, setSnap] = useState<Snapshot | null>(demo ?? null);
  const [done, setDone] = useState(demo?.done ?? 0);
  const [busy, setBusy] = useState<null | "start" | "stop">(null);
  const [note, setNote] = useState<string | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [liveDismissed, setLiveDismissed] = useState<string | null>(null);
  const doneSinceRef = useRef<number | null>(null);
  const [retired, setRetired] = useState(false);

  // Is there an extension in THIS browser? No bridge = a remote (phone, Safari, a
  // Chrome without it installed). The swipes are saved either way — only the "apply
  // them now" action needs a host, so on a remote we say where they WILL go instead
  // of offering a button that can't do anything here.
  const [remote, setRemote] = useState(false);
  useEffect(() => {
    if (demo) return;
    let alive = true;
    checkExtensionPresent().then((present) => { if (alive) setRemote(!present); });
    return () => { alive = false; };
  }, [demo]);

  // Read the dismissal AFTER mount, not in a useState initializer: the server has no
  // sessionStorage, so seeding state from it would render a different tree than the client
  // and break hydration. That makes this the one place the setState-in-effect rule has to
  // be waived. (It only became visible once stop() lost its try/catch — that construct made
  // the compiler bail on this whole file and silenced the rule everywhere in it.)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time read of an external store; see above
      if (raw) setDismissedAt(Number(raw) || null);
      const live = sessionStorage.getItem(LIVE_DISMISS_KEY);
      if (live) setLiveDismissed(live);
    } catch { /* private mode */ }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const [q, st] = await Promise.all([
        apiGet<QueueResponse>("/campaign/queue", token),
        apiGet<CampaignStatusResponse>("/campaign/status", token),
      ]);
      const head = q.queue?.[0];
      const next = head ? { title: head.title, company: head.company, platform: head.platform } : null;
      setSnap({
        waiting: q.waiting ?? 0,
        held: q.held_by_caps ?? 0,
        running: !!st.running,
        doneToday: st.today_applications ?? q.done_today ?? 0,
        next,
        dailyLimit: st.daily_limit ?? null,
        platformCounts: st.platform_counts ?? {},
        startedAt: st.started_at ?? null,
      });
      // Baseline the sitting if the deck never got to (dock opened mid-run, or a reload
      // wiped the stamp): from here on, "done" counts forward from now — under-claiming,
      // never over-claiming.
      const today = st.today_applications ?? q.done_today ?? 0;
      let base = readTapBaseline();
      if (!base && (q.waiting ?? 0) > 0) {
        markTapSessionStart(today);
        base = readTapBaseline();
      }
      setDone(base ? Math.max(0, today - base.today) : 0);
    } catch { /* a failed read leaves the last good numbers on screen */ }
  }, []);

  useEffect(() => {
    if (demo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap read of an external system (the backend); the interval below is the same call
    refresh();
    const iv = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVisible); };
  }, [demo, refresh]);

  const waiting = snap?.waiting ?? 0;
  const total = done + waiting;

  // Retire a finished batch after its moment on screen (demo previews never retire).
  useEffect(() => {
    if (demo || !snap) return;
    const finished = waiting === 0 && done > 0;
    if (!finished) { doneSinceRef.current = null; return; }
    if (doneSinceRef.current === null) doneSinceRef.current = Date.now();
    const t = setTimeout(() => {
      if (doneSinceRef.current && Date.now() - doneSinceRef.current >= DONE_LINGER_MS) {
        clearTapBaseline();
        setRetired(true);
      }
    }, DONE_LINGER_MS);
    return () => clearTimeout(t);
  }, [demo, snap, waiting, done]);

  async function applyNow() {
    if (busy) return;
    setBusy("start"); setNote(null);
    try {
      await startTapRun();
      setTimeout(() => { setBusy((b) => (b === "start" ? null : b)); refresh(); }, 4000);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  async function stop() {
    if (busy) return;
    setBusy("stop"); setNote(null);
    // Extension first. The comment that used to sit here claimed "the extension's own Stop
    // still lands" on error — it did not: the postMessage sat AFTER the awaits inside the
    // same try, so a missing session or a failed apiPost skipped the halt entirely and the
    // engine kept applying. Order and test: lib/campaign/stop.ts.
    setSnap((s) => (s ? { ...s, running: false } : s));
    const { error } = await stopCampaignEverywhere(
      () => window.postMessage({ type: "HIREDROP_STOP_CAMPAIGN" }, "*"),
      async () => {
        const { data: { session } } = await createClient().auth.getSession();
        if (session?.access_token) await apiPost("/campaign/stop", session.access_token, {});
      },
    );
    if (error) setNote(`Stopped the extension, but the server didn't confirm (${error}).`);
    setBusy(null);
  }

  function dismiss() {
    setDismissedAt(waiting);
    try { sessionStorage.setItem(DISMISS_KEY, String(waiting)); } catch { /* noop */ }
  }

  function dismissLive() {
    const key = snap?.startedAt ?? "run";
    setLiveDismissed(key);
    try { sessionStorage.setItem(LIVE_DISMISS_KEY, key); } catch { /* noop */ }
  }

  // ── Should it be on screen at all? ──────────────────────────────────────────
  if (!snap) return null;
  // No swiped batch on screen (none, retired, or hidden) + a live run → the run's counter.
  const batchHidden = retired || total === 0
    || (!demo && dismissedAt !== null && waiting <= dismissedAt);
  if (batchHidden) {
    if (!snap.running) return null;
    if (!demo && liveDismissed !== null && liveDismissed === (snap.startedAt ?? "run")) return null;
    return (
      <LiveRunDock
        snap={snap} shape={shape} busy={busy} note={note}
        onStop={stop} onHide={dismissLive}
      />
    );
  }
  // (Dismissed stays dismissed until the batch GROWS — new swipes are new news; folded
  // into batchHidden above.)

  const finished = waiting === 0 && done > 0;
  const applying = snap.running && waiting > 0;
  const stranded = !snap.running && waiting > 0;

  const pct = total > 0 ? Math.min(1, done / total) : 0;

  const headline = finished
    ? `All ${total} sent`
    : applying
      ? "Applying the jobs you swiped"
      : `${waiting} you approved ${waiting === 1 ? "isn't" : "aren't"} sent`;

  const sub = finished
    ? "Your swipes are with the employers."
    : applying
      ? snap.next
        ? `${snap.next.company || snap.next.platform}${snap.next.title ? ` · ${snap.next.title}` : ""}`
        : "Working through your approved cards…"
      : remote
        ? "Saved — they go out from Chrome on your computer."
        : "Approved — waiting for a run to send them.";

  // The gauge: a half-round arc filled left to right, with the count under it.
  // Same figure in both shapes — in "dome" it rides inside the crown, in "arch" it
  // sits inline at the left end.
  const gauge = (
    <>
      <svg viewBox="0 0 120 70" className="hd-gauge-svg">
        <path className="hd-gauge-track" d="M14 58 A46 46 0 0 1 106 58" />
        <path
          className="hd-gauge-fill"
          d="M14 58 A46 46 0 0 1 106 58"
          style={{ strokeDasharray: 144.5, strokeDashoffset: 144.5 * (1 - pct) }}
        />
      </svg>
      <div className="hd-tap-gauge-num">
        <span className="hd-gauge-done">{done}</span>
        <span className="hd-gauge-total">/{total}</span>
      </div>
    </>
  );

  return (
    <div className="hd-tap-dock-wrap" role="status" aria-live="polite">
      <div className={[
        "hd-tap-dock", `shape-${shape}`,
        finished ? "is-done" : "", applying ? "is-live" : "",
      ].join(" ")}>
        {/* The half-round element carries the progress — the shape and the number are
            the same object, not a bar bolted onto a card. */}
        <div className={shape === "dome" ? "hd-tap-dome" : "hd-tap-gauge"} aria-hidden>
          {gauge}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[14px] font-semibold leading-tight text-text">
            {applying && <span className="hd-tap-pulse" aria-hidden />}
            {headline}
          </p>
          <p className="mt-0.5 text-[12.5px] text-text2 leading-snug line-clamp-2">{sub}</p>
          {snap.held > 0 && !finished && (
            <p className="mt-0.5 text-[11.5px] text-text2/80">
              {snap.held}{" "}held by today&apos;s cap — they go out tomorrow.
            </p>
          )}
          {note && <p className="mt-0.5 text-[11.5px] text-red">{note}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stranded && !remote && (
            <button onClick={applyNow} disabled={busy !== null} data-testid="dock-apply"
              className="px-3.5 py-2 rounded-xl bg-accent text-white text-[13px] font-semibold
                transition active:scale-[.97] disabled:opacity-50">
              {busy === "start" ? "Starting…" : "Apply them now"}
            </button>
          )}
          {applying && (
            <button onClick={stop} disabled={busy !== null} data-testid="dock-stop"
              className="px-3 py-2 rounded-xl border border-border text-[13px] font-medium text-text2
                hover:text-text transition active:scale-[.97] disabled:opacity-50">
              {busy === "stop" ? "Stopping…" : "Stop"}
            </button>
          )}
          <Link href="/dashboard/tap" prefetch
            className="px-3 py-2 rounded-xl border border-border text-[13px] font-medium text-text2
              hover:text-text transition active:scale-[.97]">
            Deck
          </Link>
          <button onClick={dismiss} aria-label="Hide" title="Hide"
            className="w-7 h-7 rounded-full text-text2 hover:text-text transition active:scale-90
              flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}
              strokeLinecap="round" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name ?? id;

// One hue per platform, so the chip under the headline is the legend for the rail along
// the bottom edge. Tuned for the ink/violet dock ground; unknown ids fall back to gold.
const PLATFORM_HUE: Record<string, string> = {
  indeed: "#8FB4FF",
  ziprecruiter: "#FF9F7A",
  greenhouse: "#5AD6B0",
  lever: "#F0C874",
  ashby: "#C9A8FF",
  linkedin: "#6FC3FF",
};
const hueOf = (id: string) => PLATFORM_HUE[id] ?? "#F0C874";

/** The Auto run's live counter, in the same dock body as the tap batch. */
function LiveRunDock({ snap, shape, busy, note, onStop, onHide }: {
  snap: Snapshot;
  shape: DockShape;
  busy: null | "start" | "stop";
  note: string | null;
  onStop: () => void;
  onHide: () => void;
}) {
  const today = snap.doneToday;
  const limit = snap.dailyLimit && snap.dailyLimit < UNLIMITED_AT ? snap.dailyLimit : null;
  const pct = limit ? Math.min(1, today / limit) : 0;
  const capped = limit !== null && today >= limit;

  const platforms = Object.entries(snap.platformCounts ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const counted = platforms.reduce((sum, [, n]) => sum + n, 0);

  const headline = capped ? `Today's cap reached — ${today} sent` : "Applying for you — live";
  // The rail along the bottom edge: today's sends split by platform. Against the cap when
  // there is one (the unfilled rest is what's left today); with no cap, the split of what
  // went out — a composition, never a fake fraction of nothing.
  const railBase = limit ?? Math.max(counted, 1);
  const left = limit !== null ? Math.max(0, limit - today) : null;

  const gauge = (
    <>
      <svg viewBox="0 0 120 70" className="hd-gauge-svg">
        <path className="hd-gauge-track" d="M14 58 A46 46 0 0 1 106 58" />
        {limit !== null ? (
          <path
            className="hd-gauge-fill"
            d="M14 58 A46 46 0 0 1 106 58"
            style={{ strokeDasharray: 144.5, strokeDashoffset: 144.5 * (1 - pct) }}
          />
        ) : !capped && (
          // No cap to fill against: a light runs the track instead — "working", not a quantity.
          <path className="hd-gauge-sweep" d="M14 58 A46 46 0 0 1 106 58" pathLength={100} />
        )}
      </svg>
      <div className="hd-tap-gauge-num">
        {/* key = the count: every new send remounts the digit and replays the bump. */}
        <span key={today} className="hd-gauge-done hd-gauge-bump" data-testid="live-dock-count">{today}</span>
        <span className="hd-gauge-total">{limit !== null ? `/${limit}` : " today"}</span>
      </div>
    </>
  );

  return (
    <div className="hd-tap-dock-wrap" role="status" aria-live="polite"
      aria-label={limit !== null ? `${today} of ${limit} applications sent today` : `${today} applications sent today`}>
      <div className={["hd-tap-dock", `shape-${shape}`, "has-rail", capped ? "is-done" : "is-live"].join(" ")}>
        <div className={shape === "dome" ? "hd-tap-dome" : "hd-tap-gauge"} aria-hidden>
          {gauge}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[14px] font-semibold leading-tight text-text">
            {!capped && <span className="hd-tap-pulse" aria-hidden />}
            {headline}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {capped ? (
              <span className="text-[12.5px] text-text2">The run picks up again tomorrow.</span>
            ) : platforms.length === 0 ? (
              <span className="text-[12.5px] text-text2">Searching for the next match…</span>
            ) : (
              platforms.map(([id, n]) => (
                <span key={id} className="hd-dock-chip">
                  <i style={{ background: hueOf(id) }} aria-hidden />
                  {platformName(id)}
                  <b>{n}</b>
                </span>
              ))
            )}
            {left !== null && !capped && (
              <span className="text-[12px] text-text2 ml-0.5">{left} left today</span>
            )}
          </div>
          {note && <p className="mt-0.5 text-[11.5px] text-red">{note}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!capped && (
            <button onClick={onStop} disabled={busy !== null} data-testid="live-dock-stop"
              className="px-3 py-2 rounded-xl border border-border text-[13px] font-medium text-text2
                hover:text-text transition active:scale-[.97] disabled:opacity-50">
              {busy === "stop" ? "Stopping…" : "Stop"}
            </button>
          )}
          <Link href="/dashboard/history" prefetch
            className="px-3 py-2 rounded-xl border border-border text-[13px] font-medium text-text2
              hover:text-text transition active:scale-[.97]">
            History
          </Link>
          <button onClick={onHide} aria-label="Hide" title="Hide"
            className="w-7 h-7 rounded-full text-text2 hover:text-text transition active:scale-90
              flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}
              strokeLinecap="round" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="hd-dock-rail" aria-hidden>
          {platforms.map(([id, n]) => (
            <span key={id} style={{ width: `${(n / railBase) * 100}%`, background: hueOf(id) }} />
          ))}
        </div>
      </div>
    </div>
  );
}
