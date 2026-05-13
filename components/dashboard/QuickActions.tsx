"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button";
import { ApiError, apiGet, apiPost } from "@/lib/api";

interface Props {
  token: string;
  campaignRunning: boolean;
}

type Status = { kind: "idle" } | { kind: "ok"; msg: string } | { kind: "err"; msg: string };

export default function QuickActions({ token, campaignRunning: initialCampaignRunning }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"find" | "start" | "stop" | "email" | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [campaignRunning, setCampaignRunning] = useState(initialCampaignRunning);

  async function run<T>(
    kind: "find" | "start" | "stop" | "email",
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

  function startCampaign() {
    return run(
      "start",
      () => apiPost<{ started: boolean }>("/campaign/start", token, {
        keywords: [],
        platforms: [],
        location: "",
        job_type: "",
      }),
      () => {
        setCampaignRunning(true);
        return "Campaign started — extension will begin applying on Indeed";
      },
    );
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

  function checkEmail() {
    return run(
      "email",
      () => apiGet<{ configured: boolean; count: number }>("/tools/email-check", token),
      (r) =>
        !r.configured
          ? "Email not configured on server"
          : r.count === 0
          ? "No new recruiter replies"
          : `${r.count} new email${r.count === 1 ? "" : "s"} from recruiters`,
    );
  }

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
          <Button size="sm" variant="primary" onClick={startCampaign} disabled={busy !== null}>
            {busy === "start" ? "Starting…" : "Start Campaign"}
          </Button>
        )}

        <Button size="sm" variant="secondary" onClick={checkEmail} disabled={busy !== null}>
          {busy === "email" ? "Checking…" : "Check Email"}
        </Button>

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
