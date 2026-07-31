"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StartReadinessModal, { gateStart, type ReadinessCheck } from "@/components/dashboard/StartReadiness";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS } from "@/lib/constants";
import type { Job } from "@/lib/types";

// Ban-safety rail: never queue more than this per platform per day (mirrors the
// backend MAX_PER_PLATFORM). Keeps a swipe spree from lining up 80 applies.
const MAX_PER_PLATFORM = 15;

// Platforms the background executor can actually apply to from an approved swipe today.
// A card you Approve MUST result in a real apply, not a no-op — so this list mirrors what
// the extension's buildApprovedAtsQueue() will actually walk (ATS_PLATFORMS + verified
// natives). Greenhouse = full-auto; Lever = fills + you clear the captcha; Indeed = apply-
// by-link (CF-warmed, verified live #68); Ashby = full-auto, form-fill verified on a live
// board + _systemfield_name fix (jobflow #77), invisible reCAPTCHA (zero-touch like GH).
// Held out: ZipRecruiter (ephemeral /co/…?lk= URLs, by-link unverified) — adding it without
// the executor side = a dead swipe; ZR stays auto-only.
const TAP_APPLY_PLATFORMS = ["greenhouse", "lever", "indeed", "ashby"];

// Brand accent per platform for the monogram chip on each card — the deck mixes platforms
// (Igor: "не одна платформа, а сразу несколько в рандомном порядке"), so every card must show
// WHICH platform it's from at a glance. Hex ≈ brand color; matches PlatformConnections.tsx.
const BRAND: Record<string, string> = {
  indeed: "#2557a7",
  greenhouse: "#1f7a54",
  lever: "#5522e8",
  ashby: "#4b4ef0",
  ziprecruiter: "#1d8649",
  remoteok: "#e64a19",
};

// Dedicated Tap ("тапалка") surface — an INSTANT swipe deck over the job pool.
// (Igor 2026-07-25) The old flow filled one form, waited for the tap, then filled the
// next — so you waited ~30-60s between every card. Now cards come straight from the
// already-found pool (title / company / fit / description — no AI wait), you Approve or
// Skip instantly, and the actual cover-letter + submit happens in the BACKGROUND for the
// ones you approve. You decide on the job; the letter is written only for approvals.
export default function TapView({ token: initialToken }: { token: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [applied, setApplied] = useState(0);
  const [jobsReady, setJobsReady] = useState(0);
  const [busy, setBusy] = useState<null | "start" | "stop">(null);
  const [readyOpen, setReadyOpen] = useState(false);
  const [readyChecks, setReadyChecks] = useState<ReadinessCheck[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // The deck: pool jobs (status "new"), best-fit first, capped per platform. deck[0] is
  // the card on top. Decisions shift the head off instantly (optimistic) — the PATCH to
  // the backend rides along in the background so tapping never blocks.
  const [deck, setDeck] = useState<Job[]>([]);
  const [deckLoaded, setDeckLoaded] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0); // queued for background apply

  const [acting, setActing] = useState<null | "approve" | "skip">(null);
  const [drag, setDrag] = useState(0);
  const [fly, setFly] = useState(0);
  const dragRef = useRef<{ x: number; y: number; mode: "none" | "swipe" | "scroll" } | null>(null);
  const dragXRef = useRef(0);
  const autoStartedRef = useRef(false); // kicked the background executor on first approve?

  const [bridgeAlive, setBridgeAlive] = useState<boolean | null>(null);
  const remote = bridgeAlive === false;
  const [linkState, setLinkState] = useState<null | "sending" | "sent">(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ?? initialToken;
  }, [initialToken]);

  // Arm the extension for background apply the moment this page opens: approved swipes
  // auto-submit (the swipe IS the human decision) — no second fill-and-stop review.
  useEffect(() => {
    window.postMessage({ type: "HIREDROP_SET_REVIEW", on: false }, "*");
  }, []);

  // Bridge liveness (desktop vs phone). We only need it to know a run is live and to
  // Start/Stop the desktop engine; the deck itself is pure backend, so the phone swipes
  // the same pool with no extension needed.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_LIVE_STATE" && e.data.ok) {
        setBridgeAlive(true);
        sessionStorage.removeItem("hd_ctx_reload"); // healthy again — re-arm the auto-heal
        setRunning((r) => r || !!e.data.campaignRunning);
      }
      // Extension was reloaded/updated: the old content script in THIS tab is orphaned —
      // it answers but can't reach chrome.storage. Without this branch the probe times
      // out and a DESKTOP user gets the "your phone is the remote" screen (Igor
      // 2026-07-27). One auto-refresh re-injects a live bridge; the sessionStorage
      // guard prevents a reload loop if something is genuinely broken.
      if (e.data.type === "HIREDROP_LIVE_STATE" && !e.data.ok && e.data.error === "context_invalidated") {
        setBridgeAlive(true); // the extension IS here — never flip to phone-remote
        if (!sessionStorage.getItem("hd_ctx_reload")) {
          sessionStorage.setItem("hd_ctx_reload", String(Date.now()));
          location.reload();
        }
        return;
      }
      if (e.data.type === "HIREDROP_CAMPAIGN_STARTED") {
        setBusy(null);
        if (e.data.ok) setRunning(true);
        else setErr(e.data.message || e.data.error || "Couldn't start — try again in a moment.");
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_LIVE_STATE" }, "*");
    ask();
    const iv = setInterval(ask, 1500);
    const probe = setTimeout(() => setBridgeAlive((b) => (b === null ? false : b)), 2500);
    return () => { window.removeEventListener("message", onMsg); clearInterval(iv); clearTimeout(probe); };
  }, []);

  // ── The deck: pool jobs to swipe ──────────────────────────────────────────
  // status "new" only (untouched). Igor's principle: NOT one platform at a time — the deck
  // is SEVERAL platforms mixed in random order. So we group by platform (best-fit first
  // within each), cap per platform, then round-robin interleave across platforms in a
  // RANDOMISED platform order → consecutive cards come from different boards, sequence feels
  // random, and no single board dominates the stack. Preserves any card currently on top.
  const buildDeck = useCallback((jobs: Job[], keepTopId?: string): Job[] => {
    const fresh = jobs.filter(
      (j) =>
        (j.status || "new") === "new" &&
        (j.link || (j as { apply_url?: string }).apply_url) &&
        TAP_APPLY_PLATFORMS.includes(j.platform)
    );
    const shuffle = <T,>(arr: T[]): T[] => {
      for (let i = arr.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[k]] = [arr[k], arr[i]];
      }
      return arr;
    };
    // Group by platform; best-fit first inside each; cap so one board can't flood the deck.
    const byPlatform: Record<string, Job[]> = {};
    for (const j of fresh) (byPlatform[j.platform || "other"] ||= []).push(j);
    const queues = shuffle(Object.keys(byPlatform)).map((p) =>
      byPlatform[p].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, MAX_PER_PLATFORM)
    );
    // Round-robin interleave → mixed platforms, no long single-platform runs.
    const out: Job[] = [];
    for (let round = 0, more = true; more; round++) {
      more = false;
      for (const q of queues) {
        if (round < q.length) { out.push(q[round]); more = true; }
      }
    }
    // Don't yank the card out from under the user's thumb mid-swipe.
    if (keepTopId && out[0]?.id !== keepTopId) {
      const top = out.find((j) => j.id === keepTopId);
      if (top) return [top, ...out.filter((j) => j.id !== keepTopId)];
    }
    return out;
  }, []);

  const decidedRef = useRef<Set<string>>(new Set()); // ids already swiped this session
  // Empty deck must TRIGGER discovery, not just wait for it — "Finding more jobs…" used to
  // be a lie (nothing on the page called discovery; the pool only grew when an auto-ATS run
  // happened to). POST /jobs/find-ats is safe to fire-and-forget since PR #64: it returns
  // immediately and sweeps boards in a backend thread (10-min server cooldown + in-progress
  // guard). Client throttle keeps us from re-posting on every 8s deck poll.
  const findAtsAtRef = useRef(0);
  const triggerDiscovery = useCallback(async () => {
    const now = Date.now();
    if (now - findAtsAtRef.current < 5 * 60 * 1000) return;
    findAtsAtRef.current = now;
    try {
      const t = await getToken();
      await apiPost("/jobs/find-ats", t, {});
    } catch { /* cooldown / offline — the next empty-deck poll retries after the throttle */ }
  }, [getToken]);

  const loadDeck = useCallback(async () => {
    try {
      const t = await getToken();
      const jobs = await apiGet<Job[]>("/jobs", t);
      setDeck((prev) => {
        const top = prev[0]?.id;
        const next = buildDeck(jobs, top).filter((j) => !decidedRef.current.has(j.id));
        if (next.length === 0) triggerDiscovery();
        return next;
      });
    } catch { /* keep whatever we have */ }
    finally { setDeckLoaded(true); }
  }, [getToken, buildDeck, triggerDiscovery]);

  useEffect(() => {
    loadDeck();
    // Refill periodically so newly-found jobs join the deck without a reload.
    const iv = setInterval(loadDeck, 8000);
    return () => clearInterval(iv);
  }, [loadDeck]);

  // Applied count + jobs-ready from the backend.
  const refreshStats = useCallback(async () => {
    try {
      const t = await getToken();
      const s = await apiGet<{ today_applications: number; jobs_ready: number; running: boolean }>("/campaign/status", t);
      setApplied(s.today_applications);
      setJobsReady(s.jobs_ready);
      setRunning((r) => (remote ? s.running : r || s.running));
    } catch {}
  }, [getToken, remote]);

  useEffect(() => {
    refreshStats();
    const iv = setInterval(refreshStats, 5000);
    return () => clearInterval(iv);
  }, [refreshStats]);

  async function sendDesktopLink() {
    if (linkState) return;
    setLinkState("sending");
    try {
      const t = await getToken();
      await apiPost("/profile/send-desktop-link", t, {});
      setLinkState("sent");
      setTimeout(() => setLinkState(null), 4000);
    } catch { setLinkState(null); }
  }

  async function ensureReadyThenStart() {
    if (busy) return;
    try {
      const t = await getToken();
      const r = await gateStart(t);
      if (r.ready) { start(); return; }
      setReadyChecks(r.checks);
      setReadyOpen(true);
    } catch {
      start(); // fail-open; the extension's own start guards still protect the run
    }
  }

  function fixReadiness(fix: string) {
    setReadyOpen(false);
    if (fix === "settings") { router.push("/dashboard/settings"); return; }
    if (fix === "upgrade") { router.push("/dashboard/settings?tab=billing"); return; }
    if (fix === "onboarding") { router.push("/onboarding"); return; }
    if (fix === "campaign") { router.push("/dashboard/campaign"); return; }
    if (fix === "extension") { router.push("/extension"); return; }
    if (fix === "keywords") { router.push("/dashboard"); return; }
  }

  // Start = tell the desktop engine to (a) keep finding jobs into the pool and (b) apply
  // the ones you approve, in the background. Review mode OFF: approvals auto-submit.
  async function start() {
    if (busy) return;
    setBusy("start"); setErr(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let prefs: { keywords?: string[]; platforms?: string[]; location?: string; job_type?: string } = {};
      if (user) {
        const { data } = await supabase.from("profiles")
          .select("keywords, platforms, location, job_type").eq("user_id", user.id).single();
        prefs = data || {};
      }
      const filters = {
        keywords: prefs.keywords || [],
        platforms: prefs.platforms || [],
        location: prefs.location || "",
        job_type: prefs.job_type || "",
      };
      // Using the tapalka = TAP mode. Persist submit_mode=tap so the extension builds the
      // by-link POOL from the jobs you swiped/approved — NOT the AUTO platform search-walk.
      // Without this, submit_mode stayed 'auto' and a swipe kicked an Indeed auto-walk
      // (→ Cloudflare "Additional Verification Required", 0 applied) instead of applying the
      // cards you swiped (live 2026-07-30). Symmetric with the auto flow persisting 'auto'.
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) await supabase.from("profiles").update({ submit_mode: "tap" }).eq("user_id", u.id);
      } catch { /* non-fatal — extension also has a swipe-first guard */ }
      window.postMessage({ type: "HIREDROP_SET_REVIEW", on: false }, "*");
      window.postMessage({ type: "HIREDROP_START_CAMPAIGN", filters }, "*");
      setTimeout(() => setBusy((b) => (b === "start" ? null : b)), 45000);
      loadDeck();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  async function stop() {
    if (busy) return;
    setBusy("stop");
    try {
      const t = await getToken();
      await apiPost("/campaign/stop", t, {});
      window.postMessage({ type: "HIREDROP_STOP_CAMPAIGN" }, "*");
      setRunning(false);
    } catch {} finally { setBusy(null); }
  }

  // ── Decide: approve → queued for background apply; skip → out of the pool ──
  function decide(decision: "approve" | "skip") {
    const cur = deck[0];
    if (!cur || acting) return;
    setActing(decision);
    decidedRef.current.add(cur.id);
    // Optimistic PATCH — the card flies off instantly; the write rides in the background.
    const patch = getToken()
      .then((t) => apiPatch(`/jobs/${cur.id}/status`, t, { status: decision === "approve" ? "approved" : "skipped" }))
      .catch(() => {});
    if (decision === "approve") {
      setApprovedCount((n) => n + 1);
      // Kick the background executor on the FIRST approval so applying starts without a
      // separate "Start" click. Desktop only (the phone can't drive the computer's
      // extension). Await the PATCH first so the extension sees this job as approved
      // when it builds the queue — otherwise its footgun guard ("swipe first") trips.
      // Later approvals are picked up by the executor's rebuild + idle-refill.
      if (!remote && !running && !autoStartedRef.current) {
        autoStartedRef.current = true;
        patch.then(() => start());
      }
    }
    setFly(decision === "approve" ? 1 : -1);
    setTimeout(() => {
      setFly(0);
      setDrag(0); dragXRef.current = 0;
      setDeck((d) => d.slice(1));
      setActing(null);
    }, 260);
  }

  // ── Swipe (mobile + desktop drag): right = approve, left = skip ──
  const SWIPE_THRESHOLD = 110;
  function onPointerDown(e: ReactPointerEvent) {
    if (acting) return;
    dragRef.current = { x: e.clientX, y: e.clientY, mode: "none" };
  }
  function onPointerMove(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.mode === "none") {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) d.mode = "swipe";
      else if (Math.abs(dy) > 8) d.mode = "scroll";
    }
    if (d.mode === "swipe") { dragXRef.current = dx; setDrag(dx); }
  }
  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.mode === "swipe") {
      if (dragXRef.current > SWIPE_THRESHOLD) return decide("approve");
      if (dragXRef.current < -SWIPE_THRESHOLD) return decide("skip");
    }
    dragXRef.current = 0;
    setDrag(0);
  }

  const card = deck[0];
  const platformName = useMemo(() => {
    if (!card) return "";
    const p = card.platform || "";
    return PLATFORMS.find((x) => x.id === p)?.name || (p ? p[0].toUpperCase() + p.slice(1) : "");
  }, [card]);
  const brandColor = card ? BRAND[card.platform] || "#6C5CE7" : "#6C5CE7";
  const hasSession = running || deck.length > 0 || approvedCount > 0;

  return (
    <DashboardLayout>
      <style>{`@keyframes tapIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-text2 hover:text-text transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <div className="flex items-center gap-2 ml-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent/12 text-accent">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 11V6a2 2 0 1 1 4 0v5m0-2a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7l-2-3a2 2 0 0 1 3.3-2.2L7.5 13" />
            </svg>
          </span>
          <span className="font-semibold text-text">Tap to apply</span>
        </div>
        {hasSession && (
          <div className="text-sm text-text2 ml-1">
            <span className="text-text font-medium">{applied}</span> applied
            <span className="mx-2 text-text2/30">·</span>
            <span className="text-text font-medium">{jobsReady}</span> in queue
          </div>
        )}
        {running && !remote && (
          <button onClick={stop} disabled={busy !== null}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition
              bg-red/8 text-red border-red/20 hover:bg-red/15 disabled:opacity-50">
            <span className="inline-block w-2 h-2 rounded bg-red" />
            {busy === "stop" ? "Stopping…" : "Stop"}
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto">
        {card ? (
          /* ── Instant swipe card straight from the pool ── */
          <div className="relative select-none">
            {/* deck edges peeking underneath — real next cards, so the stack has depth */}
            <div className="absolute inset-x-3 -bottom-2 h-8 rounded-2xl bg-surface border border-border opacity-60" />
            <div className="absolute inset-x-1.5 -bottom-1 h-8 rounded-2xl bg-surface border border-border opacity-80" />

            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative bg-surface border border-border rounded-2xl p-6 shadow-sm cursor-grab active:cursor-grabbing"
              style={{
                touchAction: "pan-y",
                transform: fly
                  ? `translateX(${fly * 130}%) rotate(${fly * 16}deg)`
                  : `translateX(${drag}px) rotate(${drag * 0.04}deg)`,
                opacity: fly ? 0 : 1,
                transition: fly
                  ? "transform .26s cubic-bezier(.5,0,1,1), opacity .26s ease-in"
                  : drag === 0 ? "transform .25s ease" : "none",
                animation: !fly && drag === 0 ? "tapIn .2s ease" : undefined,
              }}
            >
              {/* Swipe-intent overlays */}
              <div className="pointer-events-none absolute top-5 left-5 px-3 py-1 rounded-lg border-2 border-green text-green font-extrabold text-sm -rotate-12"
                style={{ opacity: Math.max(0, Math.min(1, drag / SWIPE_THRESHOLD)) }}>APPLY</div>
              <div className="pointer-events-none absolute top-5 right-5 px-3 py-1 rounded-lg border-2 border-red text-red font-extrabold text-sm rotate-12"
                style={{ opacity: Math.max(0, Math.min(1, -drag / SWIPE_THRESHOLD)) }}>SKIP</div>

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Platform monogram — the deck mixes boards, so each card flags its own */}
                  <span
                    aria-label={platformName}
                    title={platformName}
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold shrink-0 select-none mt-0.5"
                    style={{ backgroundColor: `${brandColor}1a`, color: brandColor }}
                  >
                    {platformName ? platformName[0].toUpperCase() : "?"}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-text leading-snug">{card.title || "Untitled role"}</h2>
                    <p className="text-sm text-text2 mt-0.5">
                      {card.company || "—"}
                      {platformName && <span className="text-text2/50"> · {platformName}</span>}
                    </p>
                  </div>
                </div>
                {typeof card.score === "number" && (
                  <span className={[
                    "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                    card.score >= 70 ? "bg-green/10 text-green border-green/20"
                      : card.score >= 55 ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-surface2 text-text2 border-border",
                  ].join(" ")}>
                    {card.score}% fit
                  </span>
                )}
              </div>

              {/* The job description — what you actually decide on */}
              {card.description ? (
                <div className="mb-4">
                  <div className="text-[13px] text-text/90 leading-relaxed whitespace-pre-wrap
                    bg-surface2/50 border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {card.description}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-text2/60 mb-4">
                  No description captured — open the posting to read it, then decide.
                </p>
              )}

              {card.link && (
                <a href={card.link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline">Open the posting</a>
              )}

              <p className="text-[11px] text-text2/45 mt-3">
                Approve → we write your cover letter and submit in the background. Nothing sends until you approve.
              </p>

              <div className="flex gap-3 pt-4">
                <button onClick={() => decide("skip")} disabled={!!acting}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-border
                    bg-surface text-text2 hover:bg-surface2 hover:text-text disabled:opacity-50 transition">
                  Skip
                </button>
                <button onClick={() => decide("approve")} disabled={!!acting}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold
                    bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  Approve
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-text2/40 mt-3">
              Swipe → to apply · ← to skip — or use the buttons
              {approvedCount > 0 && <> · <span className="text-text2/70">{approvedCount} queued</span></>}
            </p>
          </div>
        ) : !deckLoaded ? (
          /* ── First load ── */
          <div className="bg-surface border border-border rounded-2xl p-10 text-center flex flex-col items-center gap-4"
            style={{ minHeight: "min(48vh, 380px)", justifyContent: "center" }}>
            <div className="w-9 h-9 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-text2">Loading your job deck…</p>
          </div>
        ) : remote && !hasSession ? (
          /* ── Idle on the phone ── */
          <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-2xl" aria-hidden>📱</div>
            <div>
              <h2 className="text-lg font-bold text-text">Your phone is the remote</h2>
              <p className="text-sm text-text2 mt-1 max-w-sm">
                Start a Tap session on your <strong className="text-text">computer</strong> — the jobs it finds show up
                here as cards. Swipe to approve; the computer writes each cover letter and submits.
              </p>
            </div>
            <button onClick={sendDesktopLink} disabled={linkState !== null}
              className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-surface
                text-text hover:bg-surface2 hover:border-accent/40 disabled:opacity-60 transition">
              {linkState === "sent" ? "Sent — check your inbox" : linkState === "sending" ? "Sending…" : "Email me the desktop link"}
            </button>
          </div>
        ) : running ? (
          /* ── Running but the deck is momentarily empty — finding more ── */
          <div className="bg-surface border border-border rounded-2xl p-10 text-center flex flex-col items-center gap-4"
            style={{ minHeight: "min(48vh, 380px)", justifyContent: "center" }}>
            <div className="w-9 h-9 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <div className="max-w-sm">
              <p className="text-sm font-semibold text-text">Finding more jobs…</p>
              <p className="text-xs text-text2/60 mt-1">
                You&apos;ve swiped through what&apos;s ready. New matches drop in here as we find them.
              </p>
            </div>
            {approvedCount > 0 && <p className="text-xs text-text2/50">{approvedCount} approved this session</p>}
          </div>
        ) : (
          /* ── Idle: nothing in the pool yet — start finding ── */
          <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M9 11V6a2 2 0 1 1 4 0v5m0-2a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7l-2-3a2 2 0 0 1 3.3-2.2L7.5 13" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">Tap through jobs</h2>
              <p className="text-sm text-text2 mt-1 max-w-sm">
                We find current openings that match your filters and stack them here. Swipe to Approve or Skip —
                instant. We write the cover letter and submit only for the ones you approve.
              </p>
            </div>
            <button onClick={ensureReadyThenStart} disabled={busy !== null}
              className="mt-2 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
                bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              {busy === "start" ? "Starting…" : "Start"}
            </button>
            {err && <p className="text-xs text-red">{err}</p>}
          </div>
        )}
      </div>

      <StartReadinessModal
        open={readyOpen}
        onClose={() => setReadyOpen(false)}
        checks={readyChecks}
        onFix={fixReadiness}
      />
    </DashboardLayout>
  );
}
