"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { PLATFORMS, JOB_STATUSES } from "@/lib/constants";
import type { Application } from "@/lib/types";

const statusColor: Record<string, "blue" | "yellow" | "green" | "red"> = {
  applied: "yellow",
  interview: "green",
  rejected: "red",
};

interface ApplicationHistoryProps {
  applications: Application[];
}

export default function ApplicationHistory({ applications }: ApplicationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-surface border border-border rounded-xl">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-text">Application History</h3>
      </div>

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

          return (
            <div key={app.id} className="px-5 py-4">
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
                  <Badge color={statusColor[app.status] || "gray"}>
                    {JOB_STATUSES.find((s) => s.value === app.status)?.label || app.status}
                  </Badge>
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
