"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button";
import { ApiError, apiPost } from "@/lib/api";
import { PLATFORMS, LOCATIONS } from "@/lib/constants";

interface Props {
  token: string;
  campaignRunning: boolean;
  keywords: string[];
  location: string;
  jobType: string;
  platforms: string[];
}

type Status = { kind: "idle" } | { kind: "ok"; msg: string } | { kind: "err"; msg: string };

export default function QuickActions({
  token,
  campaignRunning: initialCampaignRunning,
  keywords,
  location,
  jobType,
  platforms,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"find" | "start" | "stop" | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [campaignRunning, setCampaignRunning] = useState(initialCampaignRunning);

  const validKeywords = keywords.filter((k) => k.trim().length > 0);
  const hasPreferences = validKeywords.length > 0 && platforms.length > 0;

  async function run<T>(
    kind: "find" | "start" | "stop",
    op: () => Promise<T>,
    onOk: (r: T) => string,
  ) {
    setBusy(kind);
    setStatus({ kind: "idle" });
    try {
      const r = await op();
      setStatus({ kind: "ok", msg: onOk(r) });
      router.refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? `${e.status}: ${e.message}` : String(e);
      setStatus({ kind: "err", msg });
    } finally {
      setBusy(null);
    }
  }

  function findJobs() {
    return run(
      "find",
      () => apiPost<{ count: number; message: string }>("/jobs/find", token, {}),
      (r) => r.message || `Found ${r.count} new jobs`,
    );
  }

  async function startCampaign() {
    setBusy("start");
    setStatus({ kind: "idle" });
    try {
      await apiPost<{ started: boolean }>("/campaign/start", token, {
        keywords: validKeywords,
        platforms,
        location,
        job_type: jobType,
      });
      setCampaignRunning(true);
      router.push("/dashboard/campaign");
    } catch (e) {
      const msg = e instanceof ApiError ? `${e.status}: ${e.message}` : String(e);
      setStatus({ kind: "err", msg });
      setBusy(null);
    }
  }

  function stopCampaign() {
    return run(
      "stop",
      () => apiPost<{ stopped: boolean }>("/campaign/stop", token, {}),
      () => {
        setCampaignRunning(false);
        return "Campaign stopped";
      },
    );
  }

  const locationLabel = LOCATIONS.find((l) => l.value === location)?.label ?? location;
  const platformLabels = platforms
    .map((id) => PLATFORMS.find((p) => p.id === id)?.name ?? id)
    .join(", ");

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Button size="sm" onClick={findJobs} disabled={busy !== null}>
          {busy === "find" ? "Scanning…" : "Find Jobs"}
        </Button>

        {campaignRunning ? (
          <Button size="sm" variant="danger" onClick={stopCampaign} disabled={busy !== null}>
            {busy === "stop" ? "Stopping…" : "Stop Campaign"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={startCampaign}
            disabled={busy !== null || !hasPreferences}
            title={!hasPreferences ? "Set job preferences in Settings first" : undefined}
          >
            {busy === "start" ? "Starting…" : "Start Campaign"}
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto text-sm">
          <span
            className={[
              "inline-block w-2 h-2 rounded-full",
              campaignRunning ? "bg-green animate-pulse" : "bg-text2/40",
            ].join(" ")}
          />
          <span className="text-text2">
            {campaignRunning ? "Campaign running" : "Campaign idle"}
          </span>
        </div>
      </div>

      {/* Campaign bar — active criteria */}
      {campaignRunning && hasPreferences && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg text-xs text-text2">
          <span className="text-accent font-medium">Searching:</span>
          <span className="font-medium text-text">{validKeywords.join(", ")}</span>
          <span className="text-text2/40">·</span>
          <span>{locationLabel}</span>
          <span className="text-text2/40">·</span>
          <span>{platformLabels}</span>
          <a href="/dashboard/settings" className="ml-auto text-accent hover:underline">
            Edit
          </a>
        </div>
      )}

      {!hasPreferences && !campaignRunning && (
        <div className="text-sm rounded-lg px-3 py-2 border border-amber-400/30 bg-amber-50/60 text-amber-800">
          Set job preferences in{" "}
          <a href="/dashboard/settings" className="underline underline-offset-2 font-medium">
            Settings
          </a>{" "}
          to start a campaign.
        </div>
      )}

      {status.kind !== "idle" && (
        <div
          className={[
            "text-sm rounded-lg px-3 py-2 border",
            status.kind === "ok"
              ? "border-green/40 bg-green/5 text-text"
              : "border-red/40 bg-red/5 text-text",
          ].join(" ")}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
}
