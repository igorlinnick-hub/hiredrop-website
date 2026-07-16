"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
  const [acting, setActing] = useState<null | "approve" | "skip">(null);
  const [err, setErr] = useState<string | null>(null);
  const startedRef = useRef(false);

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
        setRunning(!!e.data.campaignRunning);
        const rp = e.data.reviewPending as ReviewPending | null;
        const fresh = rp && Date.now() - (rp.at || 0) < 30 * 60 * 1000 ? rp : null;
        setPending(fresh);
        if (fresh) setActing(null); // a new card arrived — re-enable buttons
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_LIVE_STATE" }, "*");
    ask();
    const iv = setInterval(ask, 1500);
    return () => { window.removeEventListener("message", onMsg); clearInterval(iv); };
  }, []);

  // Applied count + jobs-ready from the backend.
  const refreshStats = useCallback(async () => {
    try {
      const t = await getToken();
      const s = await apiGet<{ today_applications: number; jobs_ready: number; running: boolean }>("/campaign/status", t);
      setApplied(s.today_applications);
      setJobsReady(s.jobs_ready);
      setRunning((r) => r || s.running);
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
      const t = await getToken();
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
      await apiPost("/campaign/start", t, filters);
      window.postMessage({ type: "HIREDROP_SET_REVIEW", on: true }, "*");
      window.postMessage({ type: "HIREDROP_START_CAMPAIGN", filters }, "*");
      setRunning(true);
      startedRef.current = true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
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
    setActing(decision);
    window.postMessage({ type: "HIREDROP_REVIEW_DECISION", id: pending.id, decision }, "*");
    setPending(null); // optimistic — the next card arrives via the bridge
    if (decision === "approve") setApplied((n) => n + 1);
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
        {running && (
          <div className="text-sm text-text2 ml-1">
            <span className="text-text font-medium">{applied}</span> applied
            <span className="mx-2 text-text2/30">·</span>
            <span className="text-text font-medium">{jobsReady}</span> in queue
          </div>
        )}
        {running && (
          <button onClick={stop} disabled={busy !== null}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition
              bg-red/8 text-red border-red/20 hover:bg-red/15 disabled:opacity-50">
            <span className="inline-block w-2 h-2 rounded bg-red" />
            {busy === "stop" ? "Stopping…" : "Stop"}
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto">
        {!running ? (
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
            <button onClick={start} disabled={busy !== null}
              className="mt-2 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
                bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              {busy === "start" ? "Starting…" : "Start"}
            </button>
            {err && <p className="text-xs text-red">{err}</p>}
          </div>
        ) : pending ? (
          /* ── A prepared application is waiting for the tap ── */
          <div className="relative">
            {/* faux-stack edges for the "deck of cards" feel */}
            <div className="absolute inset-x-3 -bottom-2 h-8 rounded-2xl bg-surface border border-border opacity-60" />
            <div className="absolute inset-x-1.5 -bottom-1 h-8 rounded-2xl bg-surface border border-border opacity-80" />
            <div className="relative bg-surface border border-border rounded-2xl p-6 shadow-sm"
              style={{ animation: "tapIn .22s ease" }}>
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

              {pending.cover_letter ? (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">Cover letter</p>
                  <div className="text-[13px] text-text/90 leading-relaxed whitespace-pre-wrap
                    bg-surface2/50 border border-border rounded-lg p-4 max-h-[320px] overflow-y-auto">
                    {pending.cover_letter}
                  </div>
                </div>
              ) : pending.description ? (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text2/50 mb-1.5">Role</p>
                  <div className="text-[13px] text-text2 leading-relaxed bg-surface2/50 border border-border
                    rounded-lg p-4 max-h-[240px] overflow-y-auto">{pending.description}</div>
                </div>
              ) : null}

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
    </DashboardLayout>
  );
}
