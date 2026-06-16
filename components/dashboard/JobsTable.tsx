"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { PLATFORMS, JOB_STATUSES } from "@/lib/constants";
import type { Job } from "@/lib/types";

const statusColor: Record<string, "blue" | "yellow" | "green" | "red"> = {
  new: "blue",
  applied: "yellow",
  interview: "green",
  rejected: "red",
};

interface JobsTableProps {
  jobs: Job[];
}

export default function JobsTable({ jobs }: JobsTableProps) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-text">Job Listings</h3>
        <div className="flex gap-1">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All ({jobs.length})
          </FilterButton>
          {JOB_STATUSES.map((s) => {
            const count = jobs.filter((j) => j.status === s.value).length;
            return (
              <FilterButton key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)}>
                {s.label} ({count})
              </FilterButton>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text2">
              <th className="px-5 py-3 font-medium w-6"></th>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Platform</th>
              <th className="px-5 py-3 font-medium">AI Score</th>
              <th className="px-5 py-3 font-medium">ATS Match</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => {
              const platform = PLATFORMS.find((p) => p.id === job.platform);
              const isExpanded = expanded.has(job.id);
              const hasTailored = !!job.tailored_resume;
              return (
                <>
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-surface2/50 transition">
                    <td className="px-3 py-3.5">
                      {hasTailored && (
                        <button
                          onClick={() => toggleExpand(job.id)}
                          className="text-text2 hover:text-accent transition"
                          title="View tailored resume"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            {isExpanded
                              ? <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                              : <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                            }
                          </svg>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-text font-medium">{job.title}</td>
                    <td className="px-5 py-3.5 text-text2">{job.company}</td>
                    <td className="px-5 py-3.5 text-text2">{platform?.name || job.platform}</td>
                    <td className="px-5 py-3.5">
                      <ScoreBadge score={job.score} verdict={job.ai_verdict} />
                    </td>
                    <td className="px-5 py-3.5">
                      <AtsBadge pct={job.ats_match_pct} keywords={job.ats_keywords} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={statusColor[job.status] || "gray"}>
                        {JOB_STATUSES.find((s) => s.value === job.status)?.label || job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-text2">{new Date(job.date_found).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-5 py-3.5">
                      <a href={job.link} className="text-accent hover:text-accent2 text-xs font-medium">
                        View
                      </a>
                    </td>
                  </tr>
                  {hasTailored && isExpanded && (
                    <tr key={`${job.id}-resume`} className="border-b border-border bg-surface2/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-accent uppercase tracking-wide">Tailored Resume</span>
                          <span className="text-xs text-text2">· AI-adapted for this role · do not fabricate, only reframed</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(job.tailored_resume!)}
                            className="ml-auto text-xs text-text2 hover:text-accent transition px-2 py-0.5 rounded border border-border"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="text-xs text-text2 whitespace-pre-wrap font-mono bg-surface border border-border rounded-lg p-3 max-h-80 overflow-y-auto">
                          {job.tailored_resume}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-text2">
                  No jobs match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AtsBadge({ pct, keywords }: { pct?: number; keywords?: string[] }) {
  if (pct === undefined || pct === null) {
    return <span className="text-xs text-text2/40">—</span>;
  }
  const color =
    pct >= 80 ? "bg-green/10 text-green border-green/20"
    : pct >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red/10 text-red border-red/20";
  const tip = keywords?.length ? `ATS keywords: ${keywords.join(", ")}` : `ATS match: ${pct}%`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}
      title={tip}
    >
      {pct}%
    </span>
  );
}

function ScoreBadge({ score, verdict }: { score?: number; verdict?: string }) {
  if (score === undefined || score === null) {
    return <span className="text-xs text-text2/40">—</span>;
  }
  const color =
    score >= 8 ? "bg-green/10 text-green border-green/20"
    : score >= 5 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red/10 text-red border-red/20";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}
      title={verdict}
    >
      {score}/10
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 text-xs rounded-full transition",
        active ? "bg-accent text-white" : "text-text2 hover:bg-surface2",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
