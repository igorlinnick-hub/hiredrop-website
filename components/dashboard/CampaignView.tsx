"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiGet, apiPost } from "@/lib/api";

interface ActivityEntry {
  id: string;
  message: string;
  level: string;
  phase?: string;
  timestamp: string;
}

interface Props {
  token: string;
}

export default function CampaignView({ token }: Props) {
  const router = useRouter();
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotAge, setScreenshotAge] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState({ applied: 0, found: 0 });
  const [stopping, setStopping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const lastScreenshotTs = useRef<number>(0);
  const activityEndRef = useRef<HTMLDivElement>(null);

  const fetchScreenshot = useCallback(async () => {
    try {
      const res = await apiGet<{ data: string | null }>("/campaign/screenshot", token);
      if (res.data) {
        setScreenshot(res.data);
        lastScreenshotTs.current = Date.now();
        setScreenshotAge(0);
      }
    } catch {}
  }, [token]);

  const fetchActivity = useCallback(async () => {
    try {
      const entries = await apiGet<ActivityEntry[]>("/activity?limit=50", token);
      setActivity(entries);
    } catch {}
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const status = await apiGet<{ today_applications: number; jobs_ready: number }>(
        "/campaign/status",
        token
      );
      setStats({ applied: status.today_applications, found: status.jobs_ready });
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchScreenshot();
    fetchActivity();
    fetchStats();

    const screenshotTimer = setInterval(fetchScreenshot, 2500);
    const activityTimer = setInterval(fetchActivity, 3000);
    const statsTimer = setInterval(fetchStats, 5000);
    const ageTimer = setInterval(() => {
      if (lastScreenshotTs.current) {
        setScreenshotAge(Math.floor((Date.now() - lastScreenshotTs.current) / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(screenshotTimer);
      clearInterval(activityTimer);
      clearInterval(statsTimer);
      clearInterval(ageTimer);
    };
  }, [fetchScreenshot, fetchActivity, fetchStats]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity]);

  async function stopCampaign() {
    setStopping(true);
    try {
      await apiPost("/campaign/stop", token, {});
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

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5">

        {/* Left — activity feed */}
        <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-text">Live Activity</h3>
          </div>
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
                    "flex gap-3 px-3 py-2 rounded-lg",
                    entry.level === "error"
                      ? "bg-red/5 text-red"
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
                  <span className={entry.level === "error" ? "text-red" : "text-text"}>
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
            {screenshot && (
              <span className="text-xs text-text2/50">
                {screenshotAge <= 1 ? "Live" : `${screenshotAge}s ago`}
              </span>
            )}
          </div>

          <div className="p-4">
            {screenshot ? (
              <img
                src={screenshot}
                alt="Live browser automation"
                className="w-full rounded-lg border border-border shadow-sm"
                style={{ aspectRatio: "16/9", objectFit: "cover", objectPosition: "top" }}
              />
            ) : (
              <div
                className="w-full rounded-lg border border-border bg-surface2/50 flex flex-col
                  items-center justify-center gap-3"
                style={{ aspectRatio: "16/9" }}
              >
                <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                <p className="text-xs text-text2/50">Connecting to browser preview…</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
