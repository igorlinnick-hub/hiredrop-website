"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiPost } from "@/lib/api";
import { PLATFORMS, LOCATIONS, JOB_TYPES } from "@/lib/constants";

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
  keywords: initialKeywords,
  location: initialLocation,
  jobType: initialJobType,
  platforms: initialPlatforms,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [location, setLocation] = useState(initialLocation || "remote");
  const [jobType, setJobType] = useState(initialJobType || "full-time");
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms.length ? initialPlatforms : ["remoteok"]);
  const [kwInput, setKwInput] = useState("");

  const [campaignRunning, setCampaignRunning] = useState(initialCampaignRunning);
  const [busy, setBusy] = useState<"find" | "start" | "stop" | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // ── keyword tag input ──────────────────────────────────────────────────────

  function addKeyword(raw: string) {
    const word = raw.trim();
    if (word && !keywords.includes(word)) {
      setKeywords((prev) => [...prev, word]);
    }
    setKwInput("");
  }

  function handleKwKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(kwInput);
    } else if (e.key === "Backspace" && kwInput === "" && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1));
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  // ── save prefs + execute ───────────────────────────────────────────────────

  async function savePrefs() {
    await apiPost("/profile/prefs", token, {
      keywords,
      location,
      job_type: jobType,
      platforms,
    });
  }

  async function findJobs() {
    if (keywords.length === 0) {
      setStatus({ kind: "err", msg: "Add at least one keyword to search" });
      inputRef.current?.focus();
      return;
    }
    setBusy("find");
    setStatus({ kind: "idle" });
    try {
      await savePrefs();
      const r = await apiPost<{ count: number; message: string }>("/jobs/find", token, {});
      setStatus({ kind: "ok", msg: r.message || `Found ${r.count} new jobs` });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof ApiError ? `${e.status}: ${e.message}` : String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function startCampaign() {
    if (keywords.length === 0) {
      setStatus({ kind: "err", msg: "Add at least one keyword before starting" });
      inputRef.current?.focus();
      return;
    }
    if (platforms.length === 0) {
      setStatus({ kind: "err", msg: "Select at least one platform" });
      return;
    }
    setBusy("start");
    setStatus({ kind: "idle" });
    try {
      await savePrefs();
      await apiPost<{ started: boolean }>("/campaign/start", token, {
        keywords,
        platforms,
        location,
        job_type: jobType,
      });
      setCampaignRunning(true);
      router.push("/dashboard/campaign");
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof ApiError ? `${e.status}: ${e.message}` : String(e) });
      setBusy(null);
    }
  }

  async function stopCampaign() {
    setBusy("stop");
    setStatus({ kind: "idle" });
    try {
      await apiPost<{ stopped: boolean }>("/campaign/stop", token, {});
      setCampaignRunning(false);
      setStatus({ kind: "ok", msg: "Campaign stopped" });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof ApiError ? `${e.status}: ${e.message}` : String(e) });
    } finally {
      setBusy(null);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface border border-border rounded-xl mb-6 overflow-hidden">
      {/* Campaign running banner */}
      {campaignRunning && (
        <div className="px-5 py-2.5 bg-green/8 border-b border-green/20 flex items-center gap-2 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-green font-medium">Campaign is running</span>
          <a href="/dashboard/campaign" className="ml-auto text-xs text-green underline underline-offset-2">
            Watch live →
          </a>
        </div>
      )}

      <div className="p-5 space-y-4">

        {/* Keywords */}
        <div>
          <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-2">
            Job Title / Keywords
          </label>
          {/* Tag input */}
          <div
            className="flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 border border-border rounded-lg
              bg-surface2/40 cursor-text focus-within:border-accent/60 focus-within:ring-1
              focus-within:ring-accent/20 transition"
            onClick={() => inputRef.current?.focus()}
          >
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-accent/10 text-accent
                  text-xs font-medium rounded-full border border-accent/20"
              >
                {kw}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }}
                  className="hover:text-red transition ml-0.5"
                >
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 5.293 9.646 1.646a.5.5 0 0 1 .708.708L6.707 6l3.647 3.646a.5.5 0 0 1-.708.708L6 6.707l-3.646 3.647a.5.5 0 0 1-.708-.708L5.293 6 1.646 2.354a.5.5 0 1 1 .708-.708z" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={handleKwKeyDown}
              onBlur={() => kwInput.trim() && addKeyword(kwInput)}
              placeholder={keywords.length === 0 ? "Python Developer, React, Backend… press Enter to add" : "Add more…"}
              className="flex-1 min-w-[160px] bg-transparent text-sm text-text outline-none placeholder:text-text2/40"
            />
          </div>
        </div>

        {/* Location + Job Type row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-2">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface2/40 border border-border rounded-lg
                text-text appearance-none cursor-pointer focus:outline-none focus:border-accent/60
                focus:ring-1 focus:ring-accent/20 transition"
            >
              {LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-2">
              Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface2/40 border border-border rounded-lg
                text-text appearance-none cursor-pointer focus:outline-none focus:border-accent/60
                focus:ring-1 focus:ring-accent/20 transition"
            >
              {JOB_TYPES.map((jt) => (
                <option key={jt.value} value={jt.value}>{jt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="block text-xs font-semibold text-text2 uppercase tracking-wide mb-2">
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const selected = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition",
                    selected
                      ? "bg-accent text-white border-accent"
                      : "bg-surface2/40 text-text2 border-border hover:border-accent/40 hover:text-text",
                  ].join(" ")}
                >
                  {p.autoApply && (
                    <span
                      className={[
                        "inline-block w-1.5 h-1.5 rounded-full",
                        selected ? "bg-white/70" : "bg-green",
                      ].join(" ")}
                      title="Auto-apply"
                    />
                  )}
                  {p.name}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-text2/50">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green mr-1 align-middle" />
            Green dot = Chrome Extension auto-applies
          </p>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3 pt-1 border-t border-border/60">
          <button
            onClick={findJobs}
            disabled={busy !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border
              border-border bg-surface2/60 text-text hover:bg-surface2 hover:border-accent/40
              disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4 text-text2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {busy === "find" ? "Scanning…" : "Find Jobs"}
          </button>

          {campaignRunning ? (
            <button
              onClick={stopCampaign}
              disabled={busy !== null}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border
                bg-red/8 text-red border-red/20 hover:bg-red/15 disabled:opacity-50 transition"
            >
              <span className="inline-block w-2 h-2 rounded bg-red" />
              {busy === "stop" ? "Stopping…" : "Stop Campaign"}
            </button>
          ) : (
            <button
              onClick={startCampaign}
              disabled={busy !== null}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg
                bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd" />
              </svg>
              {busy === "start" ? "Starting…" : "Start Campaign"}
            </button>
          )}

          {status.kind !== "idle" && (
            <span
              className={[
                "ml-auto text-sm",
                status.kind === "ok" ? "text-green" : "text-red",
              ].join(" ")}
            >
              {status.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
