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
      <style>{`
        @keyframes tapIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
        /* ── Brand glass card — BOTH themes are first-class (Igor 08-05):
           day = white frosted glass with a lavender well + violet star-dots;
           night = deep space with the violet well + white starfall.
           All card colors live in these vars; the .dark override flips the world. ── */
        .hd-card-glass{
          --hdc-title:#1A1A2E; --hdc-sub:rgba(75,75,110,.85); --hdc-sub2:rgba(75,75,110,.5);
          --hdc-desc-bg:rgba(108,92,231,.05); --hdc-desc-bd:rgba(108,92,231,.13); --hdc-desc-tx:#3c3c5c;
          --hdc-hint:rgba(90,88,130,.55); --hdc-caps:rgba(108,92,231,.45); --hdc-link:#5A4BD1;
          --hdc-skip-bd:rgba(108,92,231,.22); --hdc-skip-tx:#5a5880; --hdc-skip-bg:rgba(255,255,255,.55);
          --hdc-star:#6C5CE7; --hdc-star-o:.35;
          --hdc-pmint-bg:rgba(0,184,148,.13); --hdc-pmint-tx:#0a8f6f; --hdc-pmint-bd:rgba(0,184,148,.3);
          --hdc-pvio-bg:rgba(108,92,231,.12); --hdc-pvio-tx:#5A4BD1; --hdc-pvio-bd:rgba(108,92,231,.3);
          --hdc-pmut-bg:rgba(26,26,46,.05); --hdc-pmut-tx:rgba(75,75,110,.75); --hdc-pmut-bd:rgba(26,26,46,.12);
          --hdc-well:rgba(124,108,255,.38); --hdc-sheen:rgba(255,255,255,.55);
          position:relative;overflow:hidden;border-radius:18px;
          background:
            radial-gradient(120% 90% at 50% 108%, #DDD3FF 0%, #F1EDFF 42%, #FDFDFF 80%);
          border:1px solid rgba(108,92,231,.16);
          box-shadow:
            0 24px 55px -26px rgba(108,92,231,.38), 0 2px 10px rgba(26,26,46,.06),
            inset 0 1px 0 rgba(255,255,255,.9);
        }
        .dark .hd-card-glass{
          --hdc-title:#f2f1fa; --hdc-sub:rgba(199,200,216,.78); --hdc-sub2:rgba(199,200,216,.45);
          --hdc-desc-bg:rgba(255,255,255,.045); --hdc-desc-bd:rgba(255,255,255,.09); --hdc-desc-tx:rgba(228,228,238,.88);
          --hdc-hint:rgba(210,208,228,.42); --hdc-caps:rgba(199,188,255,.5); --hdc-link:#A78BFA;
          --hdc-skip-bd:rgba(255,255,255,.14); --hdc-skip-tx:rgba(233,231,242,.75); --hdc-skip-bg:rgba(255,255,255,.04);
          --hdc-star:#fff; --hdc-star-o:.5;
          --hdc-pmint-bg:rgba(0,184,148,.16); --hdc-pmint-tx:#5eead4; --hdc-pmint-bd:rgba(0,184,148,.4);
          --hdc-pvio-bg:rgba(108,92,231,.2); --hdc-pvio-tx:#c7bcff; --hdc-pvio-bd:rgba(139,124,240,.45);
          --hdc-pmut-bg:rgba(255,255,255,.06); --hdc-pmut-tx:rgba(199,200,216,.7); --hdc-pmut-bd:rgba(255,255,255,.14);
          --hdc-well:rgba(58,45,122,.85); --hdc-sheen:rgba(255,255,255,.10);
          background:
            radial-gradient(120% 90% at 50% 108%, #3a2d7a 0%, #1a1536 42%, #0c0b14 78%);
          border:1px solid rgba(255,255,255,.12);
          box-shadow:
            0 24px 60px -24px rgba(70,48,150,.55), 0 2px 12px rgba(0,0,0,.5),
            inset 0 1px 0 rgba(255,255,255,.14);
        }
        /* convex sheen — the card reads as a physical glass slab */
        .hd-card-glass::before{
          content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
          background:radial-gradient(90% 60% at 18% -8%, var(--hdc-sheen), transparent 55%);
        }
        /* slow falling stars, like snow */
        @keyframes hdStarFall{0%{transform:translateY(-16px);opacity:0}12%{opacity:var(--o)}85%{opacity:var(--o)}100%{transform:translateY(105cqh);opacity:0}}
        .hd-stars{position:absolute;inset:0;pointer-events:none;container-type:size}
        .hd-star{position:absolute;top:0;border-radius:9999px;background:var(--hdc-star);animation:hdStarFall linear infinite}
        /* card flip-in: hold on the brand back (~0.4s so the art actually reads), then turn */
        .hd-flip{position:relative;transform-style:preserve-3d;animation:hdFlipIn 1.15s cubic-bezier(.35,1.12,.45,1) both}
        @keyframes hdFlipIn{0%,34%{transform:rotateY(180deg)}100%{transform:rotateY(0deg)}}
        .hd-face-front{backface-visibility:hidden;-webkit-backface-visibility:hidden}
        .hd-face-back{position:absolute;inset:0;transform:rotateY(180deg);
          backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;place-items:center;
          /* decorative only — must NEVER hit-test, or it eats wheel/touch scroll over the
             front (the description panel stopped scrolling, Igor 08-05) */
          pointer-events:none}
        /* the CSS back: quiet eclipse disc + glass droplet (M3 Soft Well) */
        .hd-back-well{position:absolute;left:50%;bottom:-12%;width:130%;aspect-ratio:1;transform:translateX(-50%);
          border-radius:9999px;background:radial-gradient(circle, var(--hdc-well), transparent 62%);filter:blur(6px)}
        .hd-back-drop{position:relative;width:44px;height:56px;filter:drop-shadow(0 10px 22px rgba(108,92,231,.55))}
        /* waiting droplet — replaces generic spinners in empty/loading states */
        .hd-drop-wait{width:38px;height:47px;filter:drop-shadow(0 6px 14px rgba(108,92,231,.35))}
        .hd-drop-wait .hd-dw-fill{animation:hdDropWait 2.6s ease-in-out infinite}
        @keyframes hdDropWait{0%,100%{transform:translateY(70%)}50%{transform:translateY(32%)}}
        @media (prefers-reduced-motion: reduce){
          .hd-star{animation:none;opacity:.4}
          .hd-flip{animation:none}
          .hd-drop-wait .hd-dw-fill{animation:none;transform:translateY(45%)}
        }
      `}</style>

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
          /* ── Instant swipe card — brand glass: violet well, starfall, flip-in from the back ── */
          <div className="relative select-none" style={{ perspective: "1400px" }}>
            {/* the deck: real full-size brand backs stacked under the top card — as many as
                are actually queued (max 2 shown), so the back art is always visible */}
            {deck.length > 2 && (
              <div className="absolute inset-0 pointer-events-none" aria-hidden
                style={{ transform: "translateY(22px) scale(.94) rotate(2.4deg)", opacity: 0.75 }}>
                <CardBack grad="hdDropB2" />
              </div>
            )}
            {deck.length > 1 && (
              <div className="absolute inset-0 pointer-events-none" aria-hidden
                style={{ transform: "translateY(12px) scale(.97) rotate(-2deg)", opacity: 0.95 }}>
                <CardBack grad="hdDropB1" />
              </div>
            )}

            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative cursor-grab active:cursor-grabbing"
              style={{
                touchAction: "pan-y",
                transform: fly
                  ? `translateX(${fly * 130}%) rotate(${fly * 16}deg)`
                  : `translateX(${drag}px) rotate(${drag * 0.04}deg)`,
                opacity: fly ? 0 : 1,
                transition: fly
                  ? "transform .26s cubic-bezier(.5,0,1,1), opacity .26s ease-in"
                  : drag === 0 ? "transform .25s ease" : "none",
              }}
            >
              {/* keyed by card → every new card enters with the back-to-front flip */}
              <div className="hd-flip" key={card.id}>
                {/* FRONT — the job, on deep glass. Committed dark (brand object), not theme tokens. */}
                <div className="hd-face-front hd-card-glass p-6">
                  <div className="hd-stars" aria-hidden>
                    {[
                      { l: 12, d: 13, dl: 0, o: 0.55, s: 2 },
                      { l: 28, d: 17, dl: -6, o: 0.35, s: 1.5 },
                      { l: 46, d: 11, dl: -3, o: 0.5, s: 2 },
                      { l: 63, d: 15, dl: -9, o: 0.3, s: 1.5 },
                      { l: 78, d: 12, dl: -5, o: 0.45, s: 2 },
                      { l: 91, d: 18, dl: -12, o: 0.35, s: 1.5 },
                    ].map((st, i) => (
                      <span key={i} className="hd-star" style={{
                        left: `${st.l}%`, width: st.s, height: st.s,
                        animationDuration: `${st.d}s`, animationDelay: `${st.dl}s`,
                        ["--o" as string]: st.o,
                      }} />
                    ))}
                  </div>

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Platform monogram — the deck mixes boards, so each card flags its own */}
                        <span
                          aria-label={platformName}
                          title={platformName}
                          className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold shrink-0 select-none mt-0.5"
                          style={{
                            backgroundColor: `${brandColor}26`, color: brandColor,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)",
                          }}
                        >
                          {platformName ? platformName[0].toUpperCase() : "?"}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold leading-snug" style={{ color: "var(--hdc-title)" }}>
                            {card.title || "Untitled role"}
                          </h2>
                          <p className="text-sm mt-0.5" style={{ color: "var(--hdc-sub)" }}>
                            {card.company || "—"}
                            {platformName && <span style={{ color: "var(--hdc-sub2)" }}> · {platformName}</span>}
                          </p>
                        </div>
                      </div>
                      {typeof card.score === "number" && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                          style={card.score >= 70
                            ? { background: "var(--hdc-pmint-bg)", color: "var(--hdc-pmint-tx)", borderColor: "var(--hdc-pmint-bd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.15)" }
                            : card.score >= 55
                            ? { background: "var(--hdc-pvio-bg)", color: "var(--hdc-pvio-tx)", borderColor: "var(--hdc-pvio-bd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.15)" }
                            : { background: "var(--hdc-pmut-bg)", color: "var(--hdc-pmut-tx)", borderColor: "var(--hdc-pmut-bd)" }}>
                          {card.score}% fit
                        </span>
                      )}
                    </div>

                    {/* The job description — what you actually decide on */}
                    {card.description ? (
                      <div className="mb-4">
                        <div className="text-[13px] leading-relaxed whitespace-pre-wrap rounded-lg p-4 max-h-[300px] overflow-y-auto"
                          style={{
                            color: "var(--hdc-desc-tx)",
                            background: "var(--hdc-desc-bg)",
                            border: "1px solid var(--hdc-desc-bd)",
                          }}>
                          {card.description}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] mb-4" style={{ color: "var(--hdc-sub2)" }}>
                        No description captured — open the posting to read it, then decide.
                      </p>
                    )}

                    {card.link && (
                      <a href={card.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:underline" style={{ color: "var(--hdc-link)" }}>Open the posting</a>
                    )}

                    <p className="text-[11px] mt-3" style={{ color: "var(--hdc-hint)" }}>
                      Approve → we write your cover letter and submit in the background. Nothing sends until you approve.
                    </p>

                    {/* brand hairline: violet → mint, micro wordmark (approved F3 bottom element) */}
                    <div className="mt-4 mb-1">
                      <div className="h-px w-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #6C5CE7, #00B894)", opacity: .75 }} />
                      <p className="text-center text-[8px] font-bold mt-1.5"
                        style={{ color: "var(--hdc-caps)", letterSpacing: "3px" }}>HIREDROP</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => decide("skip")} disabled={!!acting}
                        className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border disabled:opacity-50 transition"
                        style={{
                          borderColor: "var(--hdc-skip-bd)", color: "var(--hdc-skip-tx)",
                          background: "var(--hdc-skip-bg)",
                        }}>
                        Skip
                      </button>
                      <button onClick={() => decide("approve")} disabled={!!acting}
                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold
                          bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition"
                        style={{ boxShadow: "0 0 22px -6px rgba(124,108,255,.7)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"
                          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                        Approve
                      </button>
                    </div>
                  </div>
                </div>

                {/* BACK — the brand card back (M3 Soft Well): quiet eclipse + glass droplet, no stars */}
                <div className="hd-face-back">
                  <CardBack grad="hdDropTop" />
                </div>
              </div>

              {/* Swipe-intent overlays — above the flip so they never mirror */}
              <div className="pointer-events-none absolute top-5 left-5 z-10 px-3 py-1 rounded-lg border-2 border-green text-green font-extrabold text-sm -rotate-12"
                style={{ opacity: Math.max(0, Math.min(1, drag / SWIPE_THRESHOLD)) }}>APPLY</div>
              <div className="pointer-events-none absolute top-5 right-5 z-10 px-3 py-1 rounded-lg border-2 border-red text-red font-extrabold text-sm rotate-12"
                style={{ opacity: Math.max(0, Math.min(1, -drag / SWIPE_THRESHOLD)) }}>SKIP</div>
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
            <DropWait clip="dwLoad" />
            <p className="text-sm text-text2">Loading your job deck…</p>
          </div>
        ) : remote && !hasSession ? (
          /* ── Idle on the phone ── */
          <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center" aria-hidden>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
                <path d="M11 18.5h2" />
              </svg>
            </div>
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
            <DropWait clip="dwFind" />
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

// The brand card back (approved M3 "Soft Well"): dark glass, quiet eclipse disc, dimensional
// glass droplet, HIREDROP micro caps — no stars. Rendered for the flip face AND the visible
// deck stack, so gradient ids must be unique per instance (`grad`).
function CardBack({ grad }: { grad: string }) {
  return (
    <div className="hd-card-glass relative h-full w-full grid place-items-center">
      <div className="hd-back-well" aria-hidden />
      <svg className="hd-back-drop" viewBox="0 0 100 122" fill="none" aria-hidden>
        <defs>
          <radialGradient id={grad} cx="37%" cy="26%" r="82%">
            <stop offset="0" stopColor="#efe8ff" />
            <stop offset="42%" stopColor="#8b7cf0" />
            <stop offset="100%" stopColor="#3f2f95" />
          </radialGradient>
        </defs>
        <path d="M50 8 C30 44 18 62 18 78 a32 32 0 0 0 64 0 C82 62 70 44 50 8Z" fill={`url(#${grad})`} />
        <ellipse cx="37" cy="48" rx="9" ry="15" fill="#fff" opacity=".5" transform="rotate(-18 37 48)" />
      </svg>
      <span className="absolute bottom-4 left-0 right-0 text-center text-[8px] font-bold"
        style={{ color: "var(--hdc-caps)", letterSpacing: "3px" }}>HIREDROP</span>
    </div>
  );
}

// Breathing brand droplet — the waiting indicator for empty/loading states
// (replaces generic grey spinners; violet reads on both themes).
function DropWait({ clip }: { clip: string }) {
  return (
    <svg className="hd-drop-wait" viewBox="0 0 100 122" fill="none" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d="M50 8 C30 44 18 62 18 78 a32 32 0 0 0 64 0 C82 62 70 44 50 8Z" />
        </clipPath>
        <linearGradient id={`${clip}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6c5ce7" />
        </linearGradient>
      </defs>
      <path d="M50 8 C30 44 18 62 18 78 a32 32 0 0 0 64 0 C82 62 70 44 50 8Z"
        fill="rgba(108,92,231,.12)" stroke="#6C5CE7" strokeOpacity=".5" strokeWidth="4" />
      <g clipPath={`url(#${clip})`}>
        <rect className="hd-dw-fill" x="0" y="0" width="100" height="122" fill={`url(#${clip}-g)`} />
      </g>
      <ellipse cx="38" cy="50" rx="7" ry="12" fill="#fff" opacity=".3" transform="rotate(-18 38 50)" />
    </svg>
  );
}
