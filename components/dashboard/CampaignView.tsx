"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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

interface Props {
  token: string;
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
  const lastScreenshotTs = useRef<number>(0);
  const activityEndRef = useRef<HTMLDivElement>(null);

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
  }, [activity]);

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

        {/* Left — activity feed */}
        <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-text">Live Activity</h3>
          </div>
          {/* Health strip (ROADMAP_E2E.md P3): surfaces silent failures — fit skips,
              resume-attach failures, and auth issues — so "applied to nothing" reads as
              a real signal, not as "working". Only the failure chips flip red/amber. */}
          {health && (
            <div className="px-3 py-2 border-b border-border shrink-0 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-surface2/60 text-text2">
                Applied <strong className="text-text">{health.applied}</strong>
              </span>
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
          <div className="flex-1 overflow-y-auto max-h-[520px] p-2 font-mono text-xs space-y-0.5">
            {activity.length === 0 ? (
              <p className="text-text2/40 text-center py-12">
                Waiting for extension to start…
              </p>
            ) : (
              activity.slice().reverse().map((entry) => (
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
              ))
            )}
            <div ref={activityEndRef} />
          </div>
        </div>

        {/* Right — browser screenshot */}
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
      </div>
    </DashboardLayout>
  );
}
