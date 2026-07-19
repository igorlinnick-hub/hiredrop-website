"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FitChoiceModal from "@/components/dashboard/FitChoiceModal";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { ReviewPending } from "@/components/dashboard/ReviewPanel";

// Parse the extension's flat "name=... email=..." summary into labelled chips.
function parseSummary(summary?: string): { label: string; value: string }[] {
  if (!summary) return [];
  const out: { label: string; value: string }[] = [];
  const re = /(\w[\w-]*)="?([^"]*?)"?(?=\s+\w[\w-]*=|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(summary))) {
    const v = (m[2] || "").trim();
    if (v) out.push({ label: m[1].replace(/-/g, " "), value: v });
  }
  return out;
}

// Dedicated Tap ("тапалка") surface — a clean, full-width review stack, separate from
// the auto-mode campaign page. Start prepares real applications in the background (the
// extension finds current jobs, skips already-applied, fills each + writes a cover
// letter); the human just Approves or Skips one card at a time. Nothing sends until
// Approve. The automation window still opens (CWS requires a visible window to fill the
// employer's form) but the user only works with this page.
export default function TapView({ token: initialToken }: { token: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<ReviewPending | null>(null);
  const [applied, setApplied] = useState(0);
  const [jobsReady, setJobsReady] = useState(0);
  const [busy, setBusy] = useState<null | "start" | "stop">(null);
  const [fitOpen, setFitOpen] = useState(false); // launch-time fit picker before Start
  const [acting, setActing] = useState<null | "approve" | "skip">(null);
  const [drag, setDrag] = useState(0);            // live horizontal swipe offset (px)
  const [showLetter, setShowLetter] = useState(false);
  const dragRef = useRef<{ x: number; y: number; mode: "none" | "swipe" | "scroll" } | null>(null);
  const dragXRef = useRef(0);
  const [err, setErr] = useState<string | null>(null);
  const startedRef = useRef(false);
  // Bridge liveness: the extension (via ping.js) answers within a tick when it's
  // installed in THIS browser. null = probing, false = no extension here (phone /
  // clean browser) → REMOTE mode: cards come from the backend relay instead.
  const [bridgeAlive, setBridgeAlive] = useState<boolean | null>(null);
  const remote = bridgeAlive === false;
  // Fly-out direction after a decision (+1 approve / −1 skip) — the card sails
  // off-screen in that direction before the next one lands.
  const [fly, setFly] = useState(0);
  const [linkState, setLinkState] = useState<null | "sending" | "sent">(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ?? initialToken;
  }, [initialToken]);

  // Make sure the extension is in review mode the moment this page opens, so it
  // fill-stops for approval instead of auto-submitting.
  useEffect(() => {
    window.postMessage({ type: "HIREDROP_SET_REVIEW", on: true }, "*");
  }, []);

  // Live bridge: reviewPending + running come from chrome.storage via ping.js.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_LIVE_STATE" && e.data.ok) {
        setBridgeAlive(true);
        setRunning(!!e.data.campaignRunning);
        const rp = e.data.reviewPending as ReviewPending | null;
        const fresh = rp && Date.now() - (rp.at || 0) < 30 * 60 * 1000 ? rp : null;
        setPending(fresh);
        if (fresh) setActing(null); // a new card arrived — re-enable buttons
      }
      // Extension's verdict on Start (it runs the backend + builds the queue). Surface
      // a refusal — e.g. "no zero-touch greenhouse jobs" — instead of sitting on idle.
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
    // No answer in 2.5s ⇒ the extension isn't in this browser → remote mode.
    const probe = setTimeout(() => setBridgeAlive((b) => (b === null ? false : b)), 2500);
    return () => { window.removeEventListener("message", onMsg); clearInterval(iv); clearTimeout(probe); };
  }, []);

  // REMOTE mode (phone): cards come from the backend relay the desktop extension
  // publishes to. We render the card and send the decision; the computer submits.
  useEffect(() => {
    if (!remote) return;
    let stopped = false;
    const poll = async () => {
      try {
        const t = await getToken();
        const r = await apiGet<{ review: (ReviewPending & { status?: string; created_at?: string }) | null }>(
          "/review/pending",
          t
        );
        if (stopped) return;
        const rv = r.review;
        if (rv && rv.status === "pending") {
          const at = rv.created_at ? Date.parse(rv.created_at) : Date.now();
          setPending((p) => (p && p.id === rv.id ? p : { ...rv, at }));
          setActing(null);
        } else {
          setPending(null);
        }
      } catch { /* relay not deployed yet / offline — keep the idle screen */ }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(iv); };
  }, [remote, getToken]);

  // Mobile hand-off: email the desktop link (finish setup / start sessions there).
  async function sendDesktopLink() {
    if (linkState) return;
    setLinkState("sending");
    try {
      const t = await getToken();
      await apiPost("/profile/send-desktop-link", t, {});
      setLinkState("sent");
      setTimeout(() => setLinkState(null), 4000);
    } catch {
      setLinkState(null);
    }
  }

  // Applied count + jobs-ready from the backend.
  const remoteRef = useRef(false);
  remoteRef.current = remote;
  const refreshStats = useCallback(async () => {
    try {
      const t = await getToken();
      const s = await apiGet<{ today_applications: number; jobs_ready: number; running: boolean }>("/campaign/status", t);
      setApplied(s.today_applications);
      setJobsReady(s.jobs_ready);
      // Bridge mode: LIVE_STATE (1.5s) owns `running`, so only ever raise it here.
      // Remote mode has no bridge — the backend is the ONLY truth, follow it both
      // ways or the phone shows "preparing…" forever after the desktop stops.
      setRunning((r) => (remoteRef.current ? s.running : r || s.running));
    } catch {}
  }, [getToken]);

  useEffect(() => {
    refreshStats();
    const iv = setInterval(refreshStats, 5000);
    return () => clearInterval(iv);
  }, [refreshStats]);

  async function start() {
    if (busy) return;
    setBusy("start"); setErr(null);
    try {
      // Use the platforms/keywords saved on the profile (the main screen persists them).
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
      // Let the EXTENSION run the campaign — it calls /campaign/start itself and builds
      // the ATS queue (find-ats). We don't double-call the backend here (that page-side
      // POST could hang and it left the button stuck). The verdict comes back via
      // HIREDROP_CAMPAIGN_STARTED (handled in the message listener): ok → running,
      // else → error shown. busy stays "start" (button shows "Starting…") until then.
      window.postMessage({ type: "HIREDROP_SET_REVIEW", on: true }, "*");
      window.postMessage({ type: "HIREDROP_START_CAMPAIGN", filters }, "*");
      startedRef.current = true;
      // Safety net: if the extension never answers (absent/old), clear the spinner.
      setTimeout(() => setBusy((b) => (b === "start" ? null : b)), 45000);
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
      setPending(null);
    } catch {} finally { setBusy(null); }
  }

  function decide(decision: "approve" | "skip") {
    if (!pending || acting) return;
    const id = pending.id;
    setActing(decision);
    if (remote) {
      // Phone → backend relay; the extension polls it and submits on the computer.
      getToken()
        .then((t) => apiPost("/review/decision", t, { id, decision: decision === "approve" ? "approved" : "skipped" }))
        .catch(() => {});
    } else {
      window.postMessage({ type: "HIREDROP_REVIEW_DECISION", id, decision }, "*");
    }
    // Fly the card off in the decision's direction, then clear (unless a NEWER
    // card already replaced it while the animation played).
    setFly(decision === "approve" ? 1 : -1);
    setTimeout(() => {
      setFly(0);
      setDrag(0); dragXRef.current = 0; setShowLetter(false);
      setPending((p) => (p && p.id === id ? null : p));
      if (decision === "approve") setApplied((n) => n + 1);
    }, 280);
  }

  // ── Swipe (mobile + desktop drag): right = approve, left = skip. Direction-locked so
  // vertical scrolling of the description still works (touch-action: pan-y). ──
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
    setDrag(0); // snap back
  }

  const chips = parseSummary(pending?.summary);

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
        {(running || pending) && (
          <div className="text-sm text-text2 ml-1">
            <span className="text-text font-medium">{applied}</span> applied
            <span className="mx-2 text-text2/30">·</span>
            <span className="text-text font-medium">{jobsReady}</span> in queue
          </div>
        )}
        {/* Stop needs the in-browser bridge (backend stop alone doesn't halt the
            extension) — in remote mode the honest answer is "stop it on the computer". */}
        {(running || pending) && !remote && (
          <button onClick={stop} disabled={busy !== null}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition
              bg-red/8 text-red border-red/20 hover:bg-red/15 disabled:opacity-50">
            <span className="inline-block w-2 h-2 rounded bg-red" />
            {busy === "stop" ? "Stopping…" : "Stop"}
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto">
        {/* Honest remote framing: the computer is the engine, this phone is the remote. */}
        {remote && (running || pending) && (
          <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text2">
            <span aria-hidden className="text-base leading-none mt-0.5">💻</span>
            <span>
              <strong className="text-text font-medium">Prepared on your computer — you approve from here.</strong>{" "}
              Keep the computer on with Chrome open; to stop the session, use the computer.
            </span>
          </div>
        )}
        {/* Card wins whenever an application is waiting (even if the run was just
            stopped) → pending ? CARD : running ? PREPARING : IDLE. */}
        {!running && !pending ? (
          remote ? (
            /* ── Idle on the phone: sessions start on the computer; this screen is
                  the remote that lights up when a card is ready. ── */
            <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-2xl" aria-hidden>
                📱
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">Your phone is the remote</h2>
                <p className="text-sm text-text2 mt-1 max-w-sm">
                  Applications are prepared and submitted by Chrome on your <strong className="text-text">computer</strong>.
                  Start a Tap session there — the moment a card is ready, it appears here for your Approve or Skip.
                </p>
                <p className="text-xs text-text2/60 mt-2">The computer must stay on with Chrome open.</p>
              </div>
              <button onClick={sendDesktopLink} disabled={linkState !== null}
                className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-surface
                  text-text hover:bg-surface2 hover:border-accent/40 disabled:opacity-60 transition">
                {linkState === "sent" ? "Sent — check your inbox ✓" : linkState === "sending" ? "Sending…" : "📧 Email me the desktop link"}
              </button>
              {applied > 0 && <p className="text-xs text-text2/50">{applied} applied today</p>}
            </div>
          ) : (
          /* ── Idle: start the tap session ── */
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
                We find current openings, skip ones you&apos;ve applied to, and prep each application —
                cover letter and all. You just Approve or Skip. Nothing sends until you tap Approve.
              </p>
            </div>
            <button onClick={() => setFitOpen(true)} disabled={busy !== null}
              className="mt-2 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
                bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              {busy === "start" ? "Starting…" : "Start"}
            </button>
            {err && <p className="text-xs text-red">{err}</p>}
          </div>
          )
        ) : pending ? (
          /* ── A prepared application is waiting for the tap ── */
          <div className="relative select-none">
            {/* faux-stack edges for the "deck of cards" feel */}
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
                // Decision → the card sails off-screen in that direction; otherwise
                // it follows the finger (or sits home awaiting one).
                transform: fly
                  ? `translateX(${fly * 130}%) rotate(${fly * 16}deg)`
                  : `translateX(${drag}px) rotate(${drag * 0.04}deg)`,
                opacity: fly ? 0 : 1,
                transition: fly
                  ? "transform .28s cubic-bezier(.5,0,1,1), opacity .28s ease-in"
                  : drag === 0 ? "transform .25s ease" : "none",
                animation: !fly && drag === 0 ? "tapIn .22s ease" : undefined,
              }}
            >
              {/* Swipe-intent overlays */}
              <div className="pointer-events-none absolute top-5 left-5 px-3 py-1 rounded-lg border-2 border-green text-green font-extrabold text-sm -rotate-12"
                style={{ opacity: Math.max(0, Math.min(1, drag / SWIPE_THRESHOLD)) }}>APPLY ✓</div>
              <div className="pointer-events-none absolute top-5 right-5 px-3 py-1 rounded-lg border-2 border-red text-red font-extrabold text-sm rotate-12"
                style={{ opacity: Math.max(0, Math.min(1, -drag / SWIPE_THRESHOLD)) }}>SKIP</div>

              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-text leading-snug">{pending.job_title || "Application"}</h2>
                  {pending.company && <p className="text-sm text-text2 mt-0.5">{pending.company}</p>}
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  bg-green/10 text-green text-[11px] font-semibold border border-green/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" /> Ready
                </span>
              </div>

              {/* PRIMARY: the job description — what you actually decide on */}
              {pending.description ? (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">Job description</p>
                  <div className="text-[13px] text-text/90 leading-relaxed whitespace-pre-wrap
                    bg-surface2/50 border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {pending.description}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-text2/60 mb-4">No description captured for this posting — check the page directly.</p>
              )}

              {/* SECONDARY: your generated cover letter, collapsed by default */}
              {pending.cover_letter && (
                <div className="mb-4">
                  <button type="button" onClick={() => setShowLetter((v) => !v)}
                    className="text-xs font-medium text-accent hover:underline">
                    {showLetter ? "Hide" : "View"} your cover letter
                  </button>
                  {showLetter && (
                    <div className="mt-2 text-[13px] text-text/80 leading-relaxed whitespace-pre-wrap
                      bg-surface2/40 border border-border rounded-lg p-4 max-h-[240px] overflow-y-auto">
                      {pending.cover_letter}
                    </div>
                  )}
                </div>
              )}

              {chips.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">Filled fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md
                        bg-surface2/60 border border-border/70 text-[11px] text-text2">
                        <span className="text-text2/50">{c.label}</span>
                        <span className="text-text font-medium max-w-[200px] truncate">{c.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pending.job_url && (
                <a href={pending.job_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline">Open the application page ↗</a>
              )}

              <div className="flex gap-3 pt-5">
                <button onClick={() => decide("skip")} disabled={!!acting}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-border
                    bg-surface text-text2 hover:bg-surface2 hover:text-text disabled:opacity-50 transition">
                  {acting === "skip" ? "Skipping…" : "Skip"}
                </button>
                <button onClick={() => decide("approve")} disabled={!!acting}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold
                    bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  {acting === "approve" ? "Submitting…" : "Approve & Submit"}
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-text2/40 mt-3">Swipe → to apply · ← to skip — or use the buttons</p>
          </div>
        ) : (
          /* ── Running, preparing the next card ── */
          <div className="bg-surface border border-border rounded-2xl p-10 text-center flex flex-col items-center gap-4"
            style={{ minHeight: "min(52vh, 420px)", justifyContent: "center" }}>
            <div className="w-9 h-9 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-semibold text-text">Preparing your next application…</p>
              <p className="text-xs text-text2/60 mt-1 max-w-xs">
                Finding a matching job and writing the cover letter. Its card lands here in a moment.
              </p>
            </div>
            {applied > 0 && <p className="text-xs text-text2/50">{applied} approved so far</p>}
          </div>
        )}
      </div>

      {/* Launch-time fit picker → then start the tap session */}
      <FitChoiceModal
        open={fitOpen}
        onClose={() => setFitOpen(false)}
        onConfirm={() => { setFitOpen(false); start(); }}
      />
    </DashboardLayout>
  );
}
