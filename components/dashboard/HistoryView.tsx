"use client";

/**
 * HistoryView — the dedicated "History" tab: the full record of what HireDrop did,
 * per day, with links, statuses, and proof. Consolidates three surfaces that were
 * scattered (application list on the dashboard + the receipts/hand-backs panel):
 *
 *  - Metrics strip: total applied, this week, responses, response rate.
 *  - "Couldn't submit these" (hand-backs): jobs the executor filled but couldn't
 *    submit honestly — actionable rows with a deep link (finish yourself). The
 *    product invariant's "handed back" surface.
 *  - Applications grouped BY DAY: each row = job, platform, status, applied-time,
 *    and a receipt (verified dot + confirmation screenshot) when we captured one.
 *
 * Applications come from the backend (authoritative record, passed as a prop).
 * Receipts + hand-backs come from the extension via the ping.js bridge
 * (HIREDROP_READ_STORAGE), matched to applications by job title @ company.
 * Theme-safe: semantic tokens only.
 */

import { useEffect, useMemo, useState } from "react";
import type { Application } from "@/lib/types";
import { PLATFORMS, JOB_STATUSES } from "@/lib/constants";

type Receipt = {
  at: string; job_title: string; company: string; platform: string;
  job_url: string; verified: boolean; signal: string; shot?: string | null;
};
type HandBack = { job: string; reason: string; url: string };

const HANDBACK_RE = /Needs your hands:\s*(.+?)\s+—\s+(.+?)(?:\.\s*Finish it yourself:\s*(\S+))?$/;
const REASON_MAP: [RegExp, string][] = [
  [/captcha/i, "the site asked for a captcha — only you can pass it"],
  [/resume|upload/i, "the resume upload didn't go through"],
  [/submit button|no submit/i, "we couldn't find the submit button"],
  [/required field|validation/i, "this form asks something we can't answer for you"],
  [/timeout|timed out/i, "the site stopped responding partway through"],
];
const userReason = (raw: string) => REASON_MAP.find(([re]) => re.test(raw))?.[1] ?? "we couldn't finish this one automatically";

const RESPONSE_STATUSES = new Set(["interview", "interview_invite", "rejected", "received", "hired"]);
const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name ?? id;
const statusLabel = (s: string) => JOB_STATUSES.find((x) => x.value === s)?.label ?? s;
const dayKey = (iso: string) => (iso || "").slice(0, 10);
const prettyDay = (key: string) => {
  if (!key) return "Earlier";
  const d = new Date(key + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

export default function HistoryView({ applications }: { applications: Application[] }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [handbacks, setHandbacks] = useState<HandBack[]>([]);
  const [openShot, setOpenShot] = useState<string | null>(null);

  // Pull receipts + hand-backs from the extension (bridge). Non-fatal if absent.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.type !== "HIREDROP_STORAGE_DATA") return;
      const d = e.data.data || {};
      setReceipts(Array.isArray(d.receipts) ? (d.receipts as Receipt[]) : []);
      const log: unknown[] = Array.isArray(d.activity_log) ? d.activity_log : [];
      const seen = new Set<string>(); const hbs: HandBack[] = [];
      for (const entry of log) {
        const text = typeof entry === "string" ? entry
          : ((entry as { text?: string; message?: string })?.text ?? (entry as { message?: string })?.message ?? "");
        const m = HANDBACK_RE.exec(text);
        if (!m) continue;
        const key = m[1] + (m[3] || "");
        if (seen.has(key)) continue;
        seen.add(key);
        hbs.push({ job: m[1], reason: m[2], url: m[3] || "" });
      }
      setHandbacks(hbs.slice(0, 20));
    };
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_READ_STORAGE", keys: ["activity_log", "receipts"] }, "*");
    ask();
    const iv = setInterval(ask, 15000);
    return () => { window.removeEventListener("message", onMsg); clearInterval(iv); };
  }, []);

  const receiptFor = useMemo(() => {
    const map = new Map<string, Receipt>();
    for (const r of receipts) map.set(`${(r.job_title || "").toLowerCase()}|${(r.company || "").toLowerCase()}`, r);
    return (a: Application) => map.get(`${(a.title || "").toLowerCase()}|${(a.company || "").toLowerCase()}`);
  }, [receipts]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const week = applications.filter((a) => now - new Date(a.date_applied).getTime() < 7 * 86400000).length;
    const responses = applications.filter((a) => RESPONSE_STATUSES.has(a.status)).length;
    return {
      total: applications.length,
      week,
      responses,
      rate: applications.length ? Math.round((responses / applications.length) * 100) : 0,
    };
  }, [applications]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Application[]>();
    for (const a of applications) {
      const k = dayKey(a.date_applied);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(a);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [applications]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">History</h1>
        <p className="text-sm text-text2 mt-1">Everything HireDrop applied to — with links, status, and proof of submission.</p>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total applied", value: metrics.total },
          { label: "This week", value: metrics.week },
          { label: "Responses", value: metrics.responses },
          { label: "Response rate", value: `${metrics.rate}%` },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-2xl font-bold text-text tabular-nums">{m.value}</div>
            <div className="text-xs text-text2 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Couldn't submit these (hand-backs) */}
      {handbacks.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
          <p className="text-sm font-semibold text-text">Couldn&apos;t submit these — a click from you finishes them</p>
          <ul className="mt-2 space-y-1.5">
            {handbacks.map((h, i) => (
              <li key={i} className="text-[13px] leading-snug">
                {h.url
                  ? <a href={h.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">{h.job} ↗</a>
                  : <span className="font-medium text-text">{h.job}</span>}
                <span className="text-text2" title={h.reason}> — {userReason(h.reason)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Applications by day */}
      {byDay.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-text2 text-sm">
          No applications yet. Start a campaign and they&apos;ll appear here, grouped by day.
        </div>
      ) : (
        byDay.map(([day, apps]) => (
          <div key={day}>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold text-text">{prettyDay(day)}</h2>
              <span className="text-xs text-text2 tabular-nums">{apps.length} application{apps.length === 1 ? "" : "s"}</span>
            </div>
            <div className="rounded-xl border border-border bg-surface divide-y divide-border">
              {apps.map((a) => {
                const r = receiptFor(a);
                return (
                  <div key={a.id} className="p-3.5 flex items-center gap-3 flex-wrap">
                    <span
                      className={["inline-block w-2 h-2 rounded-full shrink-0",
                        r ? (r.verified ? "bg-emerald-500" : "bg-amber-400") : "bg-border"].join(" ")}
                      title={r ? (r.verified ? `confirmed (${r.signal})` : "submitted — confirmation page not detected") : "no receipt captured"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text truncate">{a.title} <span className="text-text2 font-normal">@ {a.company}</span></div>
                      <div className="text-xs text-text2">
                        {platformName(a.platform)}
                        {" · "}
                        {new Date(a.date_applied).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span className={["text-[11px] px-2 py-0.5 rounded-full border shrink-0",
                      RESPONSE_STATUSES.has(a.status) ? "border-accent/40 text-accent" : "border-border text-text2"].join(" ")}>
                      {statusLabel(a.status)}
                    </span>
                    {a.resume_pdf_url && (
                      <a href={a.resume_pdf_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:underline shrink-0">résumé sent ↗</a>
                    )}
                    {r?.shot && (
                      <button onClick={() => setOpenShot(openShot === r.shot ? null : r.shot!)} className="text-[11px] text-accent hover:underline shrink-0">
                        {openShot === r.shot ? "hide proof" : "view proof"}
                      </button>
                    )}
                    {r?.shot && openShot === r.shot && (
                      <div className="w-full mt-2 rounded-lg border border-border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.shot} alt="Submission confirmation" className="w-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
