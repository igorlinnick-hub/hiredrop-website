"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { PLATFORMS, JOB_STATUSES } from "@/lib/constants";
import type { Application } from "@/lib/types";

const statusColor: Record<string, "blue" | "yellow" | "green" | "red"> = {
  applied: "yellow",
  received: "blue",
  interview: "green",
  interview_invite: "green",
  rejected: "red",
};

interface ApplicationHistoryProps {
  applications: Application[];
  token: string;
}

export default function ApplicationHistory({ applications, token }: ApplicationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedResumeId, setExpandedResumeId] = useState<string | null>(null);
  const [hiredId, setHiredId] = useState<string | null>(null);
  const [hiredDone, setHiredDone] = useState<string | null>(null);

  async function markHired(appId: string) {
    setHiredId(appId);
    try {
      await fetch(`/api/v1/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "hired" }),
      });
      setHiredDone(appId);
    } catch {
      // silently ignore — user still sees the modal
    }
    setHiredId(null);
  }

  const interviewApps = applications.filter((a) =>
    ["interview", "interview_invite"].includes(a.status)
  );

  return (
    <div className="bg-surface border border-border rounded-xl">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-text">Application History</h3>
        {interviewApps.length > 0 && !hiredDone && (
          <span className="text-xs text-green font-medium animate-pulse">
            {interviewApps.length} interview{interviewApps.length > 1 ? "s" : ""} pending
          </span>
        )}
      </div>

      {/* Hired celebration modal */}
      {hiredDone && (
        <div className="mx-5 my-4 p-5 rounded-xl border border-green/30 bg-green/8 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold text-text text-sm">Congratulations on your new job!</p>
          <p className="text-xs text-text2 mt-1 mb-4">
            You got here by sending applications on autopilot. Know someone job hunting?
          </p>
          <a
            href="https://hiredrop.io?ref=hired"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent2 transition"
          >
            Share HireDrop →
          </a>
        </div>
      )}

      {applications.length === 0 && (
        <div className="px-5 py-10 text-center text-text2">
          <p className="text-sm">No applications yet.</p>
          <p className="text-xs mt-1">Start a campaign and the extension will apply on your behalf — every submission will appear here.</p>
        </div>
      )}

      <div className="divide-y divide-border">
        {applications.map((app) => {
          const platform = PLATFORMS.find((p) => p.id === app.platform);
          const expanded = expandedId === app.id;
          const expandedResume = expandedResumeId === app.id;
          const hasResponse = ["interview", "interview_invite", "rejected", "received"].includes(app.status);
          const isInterview = ["interview", "interview_invite"].includes(app.status);
          const isHired = hiredDone === app.id || app.status === "hired";

          return (
            <div key={app.id} className={`px-5 py-4${hasResponse ? " bg-surface2/40" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {app.title} — {app.company}
                  </p>
                  <p className="text-xs text-text2 mt-0.5">
                    {platform?.name} &middot; Applied {app.date_applied}
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <Badge color={statusColor[app.status] || "yellow"}>
                    {JOB_STATUSES.find((s) => s.value === app.status)?.label || app.status}
                  </Badge>

                  {isInterview && !isHired && !hiredDone && (
                    <button
                      onClick={() => markHired(app.id)}
                      disabled={hiredId === app.id}
                      className="text-xs font-semibold text-green border border-green/30 rounded-full px-2.5 py-0.5 hover:bg-green/10 transition disabled:opacity-50"
                    >
                      {hiredId === app.id ? "Saving…" : "I got hired! 🎉"}
                    </button>
                  )}

                  {app.tailored_resume && (
                    <button
                      onClick={() => setExpandedResumeId(expandedResume ? null : app.id)}
                      className="text-xs text-accent/80 hover:text-accent"
                    >
                      {expandedResume ? "Hide draft" : "Resume draft"}
                    </button>
                  )}

                  {app.cover_letter && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : app.id)}
                      className="text-xs text-accent hover:text-accent2"
                    >
                      {expanded ? "Hide" : "Cover letter"}
                    </button>
                  )}
                </div>
              </div>

              {expandedResume && app.tailored_resume && (
                <div className="mt-3 p-3 bg-surface2 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-accent/70 uppercase tracking-wider">
                      Tailored Resume Draft
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(app.tailored_resume!)}
                      className="text-[11px] text-text2 hover:text-accent transition"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[11px] text-text2/60 mb-2">
                    Keyword-tailored version for this role. Your ATS-formatted PDF was submitted to the employer.
                  </p>
                  <pre className="text-xs text-text2 whitespace-pre-wrap leading-relaxed font-mono">
                    {app.tailored_resume}
                  </pre>
                </div>
              )}

              {expanded && app.cover_letter && (
                <div className="mt-3 p-3 bg-surface2 rounded-lg text-sm text-text2 leading-relaxed">
                  {app.cover_letter}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
