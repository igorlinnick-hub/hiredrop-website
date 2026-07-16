"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ReviewPanel, { ReviewPending } from "@/components/dashboard/ReviewPanel";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface ActivityEntry {
  id: string;
  message: string;
  level: string;
  phase?: string;
  timestamp: string;
}

interface HealthSummary {
  applied: number;
  skipped_fit: number;
  skipped_no_resume: number;
  resume_fail: number;
  auth_401: number;
  by_level: { info: number; warn: number; error: number };
  last_error_msg?: string | null;
}

// Pending human hand-off (captcha / security check) reported by the extension
// via the ping.js bridge (HIREDROP_GET_LIVE_STATE → chrome.storage.captchaWaiting).
interface CaptchaWaiting {
  url?: string;
  site?: string;
  signal?: string;
  at?: number;
}

interface Props {
  token: string;
}

// ── Hero counter (odometer) ──────────────────────────────────────────────────

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// One rolling digit column: 0–9 stacked vertically, translated to the current
// digit. On change the column slides — the classic odometer effect.
function OdometerDigit({ digit }: { digit: number }) {
  return (
    <span aria-hidden className="inline-block overflow-hidden align-top" style={{ height: "1em" }}>
      <span
        className="block"
        style={{
          transform: `translateY(-${digit}em)`,
          transition: "transform 700ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {DIGITS.map((n) => (
          <span key={n} className="block" style={{ height: "1em", lineHeight: "1em" }}>{n}</span>
        ))}
      </span>
    </span>
  );
}

function OdometerNumber({ value }: { value: number }) {
  const s = String(value);
  return (
    // Columns keyed by distance from the right so the units column keeps its
    // identity (and its roll animation) when the number gains a digit.
    <span className="tabular-nums" aria-label={s}>
      {s.split("").map((ch, i) => (
        <OdometerDigit key={s.length - i} digit={Number(ch)} />
      ))}
    </span>
  );
}

export default function CampaignView({ token: initialToken }: Props) {
  const router = useRouter();
  const [screenshotAge, setScreenshotAge] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState({ applied: 0, found: 0 });
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [previewWaitSecs, setPreviewWaitSecs] = useState(0);
  const [captcha, setCaptcha] = useState<CaptchaWaiting | null>(null);
  // Tap mode: the extension reports reviewMode + the application awaiting approval
  // (both live from chrome.storage via the ping.js bridge). In tap mode the right
  // panel becomes the review card instead of the raw browser preview.
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewPending, setReviewPending] = useState<ReviewPending | null>(null);
  const lastScreenshotTs = useRef<number>(0);
  const activityEndRef = useRef<HTMLDivElement>(null);
  // The raw log is diagnostics, not the show — the hero counter is. Tucked
  // behind a toggle, closed by default.
  const [showLog, setShowLog] = useState(false);
  // One-shot celebration burst each time the applied counter ticks up.
  const [bumpKey, setBumpKey] = useState(0);
  const prevAppliedRef = useRef<number | null>(null);

  // Crossfade: two slots alternate so the outgoing frame stays visible during the fade
  const [slots, setSlots] = useState<[string | null, string | null]>([null, null]);
  const [frontIdx, setFrontIdx] = useState<0 | 1>(0);
  const frontIdxRef = useRef<0 | 1>(0);

  async function getToken(): Promise<string> {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ?? initialToken;
  }

  const fetchScreenshot = useCallback(async () => {
    try {
      const t = await getToken();
      const res = await apiGet<{ data: string | null }>("/campaign/screenshot", t);
      if (res.data) {
        const next = (1 - frontIdxRef.current) as 0 | 1;
        setSlots(prev => {
          const s: [string | null, string | null] = [prev[0], prev[1]];
          s[next] = res.data;
          return s;
        });
        frontIdxRef.current = next;
        setFrontIdx(next);
        lastScreenshotTs.current = Date.now();
        setScreenshotAge(0);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const t = await getToken();
      const entries = await apiGet<ActivityEntry[]>("/activity?limit=50", t);
      setActivity(entries);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const t = await getToken();
      const h = await apiGet<HealthSummary>("/activity/summary?window_hours=24", t);
      setHealth(h);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const t = await getToken();
      const status = await apiGet<{ today_applications: number; jobs_ready: number }>(
        "/campaign/status",
        t
      );
      setStats({ applied: status.today_applications, found: status.jobs_ready });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchScreenshot();
    fetchActivity();
    fetchStats();
    fetchHealth();

    const screenshotTimer = setInterval(fetchScreenshot, 400);
    const activityTimer = setInterval(fetchActivity, 3000);
    const statsTimer = setInterval(fetchStats, 5000);
    const healthTimer = setInterval(fetchHealth, 5000);
    const startTs = Date.now();
    const ageTimer = setInterval(() => {
      if (lastScreenshotTs.current) {
        setScreenshotAge(Math.floor((Date.now() - lastScreenshotTs.current) / 1000));
      } else {
        setPreviewWaitSecs(Math.floor((Date.now() - startTs) / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(screenshotTimer);
      clearInterval(activityTimer);
      clearInterval(statsTimer);
      clearInterval(healthTimer);
      clearInterval(ageTimer);
    };
  }, [fetchScreenshot, fetchActivity, fetchStats, fetchHealth]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity, showLog]);

  useEffect(() => {
    if (prevAppliedRef.current !== null && stats.applied > prevAppliedRef.current) {
      setBumpKey((k) => k + 1);
    }
    prevAppliedRef.current = stats.applied;
  }, [stats.applied]);

  // Captcha hand-off state, live from the extension via the ping.js bridge
  // (reads chrome.storage directly — no backend latency, survives SW restarts).
  // The extension pauses on a captcha and resumes the moment the user clears it;
  // this banner is the dashboard-side half of that hand-off.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_LIVE_STATE" && e.data.ok) {
        const cw = e.data.captchaWaiting as CaptchaWaiting | null;
        // Stale-guard: the extension self-stops after 2h of an unsolved captcha —
        // anything older is a leftover, not an active hand-off.
        setCaptcha(cw && Date.now() - (cw.at || 0) < 2 * 60 * 60 * 1000 ? cw : null);
        setReviewMode(!!e.data.reviewMode);
        const rp = e.data.reviewPending as ReviewPending | null;
        // Same stale-guard: a pending review older than the 30-min extension timeout
        // has already been auto-skipped — don't show a dead card.
        setReviewPending(rp && Date.now() - (rp.at || 0) < 30 * 60 * 1000 ? rp : null);
      }
      // The mode toggle flipped review on/off — reflect it instantly (don't wait for
      // the next 3s live-state poll), so the panel swaps the moment you pick Tap/Auto.
      if (e.data.type === "HIREDROP_REVIEW_SET") {
        setReviewMode(!!e.data.on);
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_LIVE_STATE" }, "*");
    ask();
    const iv = setInterval(ask, 3000);
    return () => {
      window.removeEventListener("message", onMsg);
      clearInterval(iv);
    };
  }, []);

  async function stopCampaign() {
    setStopping(true);
    try {
      const t = await getToken();
      await apiPost("/campaign/stop", t, {});
      // Tell the extension to actually halt — apiPost only updates the backend.
      // ping.js (injected on hiredrop.io) relays this to the service worker,
      // which clears chrome.storage.local.campaignRunning so content.js aborts
      // its in-flight form fill. Without this, Stop here only updated the DB and
      // the extension kept applying. Mirrors QuickActions.stopCampaign().
      window.postMessage({ type: "HIREDROP_STOP_CAMPAIGN" }, "*");
      setStopped(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch {
      setStopping(false);
    }
  }

  // Send the human's Approve/Skip back to the extension (ping.js → chrome.storage;
  // content.js in the automation window polls it and submits or skips). Clear the card
  // optimistically so the panel returns to "filling next" until the next one arrives.
  function sendReviewDecision(id: string, decision: "approve" | "skip") {
    window.postMessage({ type: "HIREDROP_REVIEW_DECISION", id, decision }, "*");
    setReviewPending(null);
  }

  if (stopped) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-text text-lg">Campaign complete</p>
          <p className="text-sm text-text2">
            {stats.applied} application{stats.applied !== 1 ? "s" : ""} sent today
          </p>
          <p className="text-xs text-text2/50">Redirecting to dashboard…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <style>{`
        @keyframes hd-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hd-entry { animation: hd-slide-in 0.2s ease both; }
        /* Ambient radar rings — the campaign is out hunting */
        @keyframes hd-ring {
          0%   { width: 70px;  height: 70px;  opacity: 0.5; }
          100% { width: 300px; height: 300px; opacity: 0; }
        }
        .hd-ring {
          position: absolute;
          border-radius: 9999px;
          border: 1.5px solid rgba(108, 92, 231, 0.35);
          width: 70px; height: 70px;
          animation: hd-ring 2.6s cubic-bezier(0, 0.55, 0.45, 1) infinite;
        }
        /* One-shot green burst when an application lands */
        @keyframes hd-burst {
          0%   { transform: translate(-50%, -50%) scale(0.45); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(2.4);  opacity: 0; }
        }
        .hd-burst {
          position: absolute; left: 50%; top: 50%;
          width: 110px; height: 110px; border-radius: 9999px;
          border: 2px solid var(--green);
          box-shadow: 0 0 28px rgba(0, 184, 148, 0.4);
          animation: hd-burst 0.9s ease-out both;
        }
        /* "Working" dots next to the current action */
        @keyframes hd-dot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }
        .hd-dot {
          display: inline-block; width: 4px; height: 4px;
          border-radius: 9999px; background: var(--accent);
          animation: hd-dot 1.2s ease-in-out infinite;
        }
        /* Current-action line slides in when the message changes */
        @keyframes hd-status-in {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hd-status { animation: hd-status-in 0.35s ease both; }
      `}</style>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-text2 hover:text-text transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </a>

        <div className="flex items-center gap-2 ml-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="font-semibold text-text">Campaign Live</span>
        </div>

        <div className="text-sm text-text2">
          <span className="text-text font-medium">{stats.applied}</span>
          {" "}applied
          <span className="mx-2 text-text2/30">·</span>
          <span className="text-text font-medium">{stats.found}</span>
          {" "}jobs ready
        </div>

        <button
          onClick={stopCampaign}
          disabled={stopping}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition
            bg-red/8 text-red border-red/20 hover:bg-red/15 disabled:opacity-50"
        >
          <span className="inline-block w-2 h-2 rounded bg-red" />
          {stopping ? "Stopping…" : "Stop Campaign"}
        </button>
      </div>

      {/* Captcha hand-off CTA — the explicit "your turn" moment. The campaign is
          paused until the human clears the check; it resumes on its own after. */}
      {captcha && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-yellow/10 border border-yellow/30">
          <svg className="w-5 h-5 text-yellow shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold text-text">
              Your turn: solve the captcha &amp; submit
            </p>
            <p className="text-xs text-text2 mt-0.5">
              {captcha.site || "The site"} is asking for a human check. Switch to the automation window, solve it, and hit submit if the form asks for one — we&apos;ve filled everything else. The campaign resumes automatically.
            </p>
          </div>
        </div>
      )}

      {/* Automation window notice */}
      <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-surface border border-border text-xs text-text2">
        <svg className="w-4 h-4 text-accent/70 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong className="text-text font-medium">A second Chrome window will open</strong> — that&apos;s the automation browser. Keep it open (don&apos;t minimize) while the campaign runs so the live preview works here. Only the job-application tabs it drives are captured — never your other tabs.
        </span>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5">

        {/* Left — live counter hero + current action; raw log behind a toggle */}
        <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-text">Live Activity</h3>
          </div>

          {/* Hero: THE number. Radar rings pulse while the campaign hunts; a green
              burst fires each time the counter ticks up. */}
          <div className="relative px-5 pt-10 pb-7 text-center overflow-hidden shrink-0">
            <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="hd-ring" />
              <span className="hd-ring" style={{ animationDelay: "1.3s" }} />
            </div>
            <div className="relative inline-block">
              {bumpKey > 0 && <span key={bumpKey} aria-hidden className="hd-burst pointer-events-none" />}
              <div className="text-6xl font-bold text-text leading-none">
                <OdometerNumber value={stats.applied} />
              </div>
            </div>
            <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text2/60">
              applications sent today
            </p>
            {stats.found > 0 && (
              <p className="relative mt-1 text-xs text-text2/50">{stats.found} jobs ready in the queue</p>
            )}
          </div>

          {/* Current action — the newest log line, one line only, animated on change */}
          <div className="px-5 pb-5 shrink-0">
            <div className="flex items-center justify-center gap-2 min-h-[20px] text-xs text-text2">
              {activity.length > 0 ? (
                <span key={activity[0].id} className="hd-status flex items-center gap-2 max-w-full">
                  <span aria-hidden className="flex gap-0.5 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="hd-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  <span className={[
                    "truncate",
                    activity[0].level === "error" ? "text-red" : activity[0].level === "warn" ? "text-yellow" : "",
                  ].join(" ")}>
                    {activity[0].message}
                  </span>
                </span>
              ) : (
                <span className="text-text2/40">Waiting for extension to start…</span>
              )}
            </div>
          </div>

          {/* Health strip (ROADMAP_E2E.md P3): surfaces silent failures — fit skips,
              resume-attach failures, and auth issues — so "applied to nothing" reads as
              a real signal, not as "working". Only the failure chips flip red/amber.
              (No "Applied" chip here — the hero owns that number; two windows of the
              same stat next to each other only read as a bug.) */}
          {health && (
            <div className="px-3 py-2 border-t border-border shrink-0 flex flex-wrap justify-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-surface2/60 text-text2">
                Skipped (fit) <strong className="text-text">{health.skipped_fit}</strong>
              </span>
              {health.skipped_no_resume > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow/10 text-yellow">
                  No résumé {health.skipped_no_resume}
                </span>
              )}
              {health.resume_fail > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red/10 text-red">
                  Résumé fail {health.resume_fail}
                </span>
              )}
              {health.auth_401 > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red/10 text-red" title={health.last_error_msg || ""}>
                  Reconnect needed ({health.auth_401})
                </span>
              )}
            </div>
          )}

          {/* Raw log — diagnostics on demand */}
          <button
            type="button"
            onClick={() => setShowLog((s) => !s)}
            className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 border-t border-border
              text-[11px] font-medium text-text2/60 hover:text-text2 hover:bg-surface2/40 transition shrink-0"
          >
            {showLog ? "Hide activity log" : "Show activity log"}
            <svg className={`w-3 h-3 transition-transform ${showLog ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showLog && (
            <div className="overflow-y-auto max-h-[320px] p-2 font-mono text-xs space-y-0.5 border-t border-border">
              {activity.slice().reverse().map((entry) => (
                <div
                  key={entry.id}
                  className={[
                    "hd-entry flex gap-3 px-3 py-2 rounded-lg",
                    entry.level === "error"
                      ? "bg-red/5 text-red"
                      : entry.level === "warn"
                      ? "bg-yellow/5 text-yellow"
                      : "hover:bg-surface2/60 text-text2",
                  ].join(" ")}
                >
                  <span className="text-text2/40 shrink-0 tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className={entry.level === "error" ? "text-red" : entry.level === "warn" ? "text-yellow" : "text-text"}>
                    {entry.message}
                  </span>
                </div>
              ))}
              <div ref={activityEndRef} />
            </div>
          )}
        </div>

        {/* Right — in tap mode the review card replaces the raw browser preview */}
        {reviewMode ? (
          <ReviewPanel reviewPending={reviewPending} onDecision={sendReviewDecision} />
        ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Browser Preview</h3>
            {(slots[0] || slots[1]) && (
              <span className="text-xs text-text2/50">
                {screenshotAge <= 1 ? "Live" : `${screenshotAge}s ago`}
              </span>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs text-text2/50 mb-3">
              Your extension is applying to jobs right now — this is the live view.
            </p>
            <div
              className="relative w-full rounded-lg border border-border overflow-hidden shadow-sm bg-surface2/50"
              style={{ aspectRatio: "16/9" }}
            >
              {slots[0] || slots[1] ? (
                <>
                  {([0, 1] as const).map((i) => (
                    slots[i] && (
                      <img
                        key={i}
                        src={slots[i]!}
                        alt="Live browser automation"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                        style={{
                          opacity: i === frontIdx ? 1 : 0,
                          transition: "opacity 150ms ease",
                        }}
                      />
                    )
                  ))}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  {previewWaitSecs < 45 ? (
                    <>
                      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                      <p className="text-xs text-text2/50">Connecting to browser preview…</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-text2/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-text2/60 font-medium">Preview not available</p>
                      <p className="text-xs text-text2/40 max-w-[200px]">
                        The extension may have DevTools open on the automation tab, blocking the preview stream.
                        Close DevTools and reload this page.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
