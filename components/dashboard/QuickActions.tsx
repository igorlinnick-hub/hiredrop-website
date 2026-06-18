"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, LOCATIONS, JOB_TYPES } from "@/lib/constants";

interface Props {
  token: string;
  campaignRunning: boolean;
  keywords: string[];
  location: string;
  jobType: string;
  platforms: string[];
  onboardingComplete: boolean;
  hasResume: boolean;
}

type Busy = "find" | "start" | "stop" | null;

export default function QuickActions({
  token,
  campaignRunning: initialCampaignRunning,
  keywords: initialKeywords,
  location: initialLocation,
  jobType: initialJobType,
  platforms: initialPlatforms,
  onboardingComplete,
  hasResume,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [location, setLocation] = useState(initialLocation || "remote");
  const [jobType, setJobType] = useState(initialJobType || "full-time");
  const [platforms, setPlatforms] = useState<string[]>(
    initialPlatforms.length ? initialPlatforms : ["remoteok"]
  );
  const [kwInput, setKwInput] = useState("");
  const [campaignRunning, setCampaignRunning] = useState(initialCampaignRunning);
  const [busy, setBusy] = useState<Busy>(null);
  const [err, setErr] = useState<string | null>(null);

  // ── keyword tag input ──────────────────────────────────────────────────────

  function addKeyword(raw: string) {
    const word = raw.trim();
    if (word && !keywords.includes(word)) setKeywords((p) => [...p, word]);
    setKwInput("");
  }

  function handleKwKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(kwInput);
    } else if (e.key === "Backspace" && kwInput === "" && keywords.length > 0) {
      setKeywords((p) => p.slice(0, -1));
    }
  }

  function togglePlatform(id: string) {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  // ── save + execute ─────────────────────────────────────────────────────────

  async function getFreshToken(): Promise<string> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    // Session gone — force re-login
    router.push("/login");
    throw new Error("Session expired — please log in again");
  }

  async function savePrefs() {
    const t = await getFreshToken();
    await apiPost("/profile/prefs", t, { keywords, location, job_type: jobType, platforms });
  }

  async function findJobs() {
    if (!keywords.length) { setErr("Add at least one keyword"); inputRef.current?.focus(); return; }
    setBusy("find"); setErr(null);
    try {
      const t = await getFreshToken();
      await savePrefs();
      await apiPost("/jobs/find", t, {});
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function startCampaign() {
    if (!onboardingComplete) { setErr("Complete your profile setup first — click \"Start setup\" above."); return; }
    if (!keywords.length) { setErr("Add at least one keyword"); inputRef.current?.focus(); return; }
    if (!platforms.length) { setErr("Select at least one platform"); return; }
    setBusy("start"); setErr(null);
    try {
      const t = await getFreshToken();
      await savePrefs();
      await apiPost("/campaign/start", t, { keywords, platforms, location, job_type: jobType });
      window.postMessage({
        type: "HIREDROP_START_CAMPAIGN",
        filters: { keywords, platforms, location, job_type: jobType },
      }, "*");
      setCampaignRunning(true);
      router.push("/dashboard/campaign");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
      setBusy(null);
    }
  }

  async function stopCampaign() {
    setBusy("stop"); setErr(null);
    try {
      const t = await getFreshToken();
      await apiPost("/campaign/stop", t, {});
      window.postMessage({ type: "HIREDROP_STOP_CAMPAIGN" }, "*");
      setCampaignRunning(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally { setBusy(null); }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const locationLabel = LOCATIONS.find((l) => l.value === location)?.label ?? location;
  const jobTypeLabel = JOB_TYPES.find((j) => j.value === jobType)?.label ?? jobType;

  return (
    <div className="mb-6 space-y-2">

      {/* ── Main search bar ── */}
      <div className="flex gap-2 items-stretch">

        {/* Keyword tag input */}
        <div
          className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2
            bg-surface border border-border rounded-xl cursor-text
            focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10 transition"
          onClick={() => inputRef.current?.focus()}
        >
          <svg className="w-4 h-4 text-text2/50 shrink-0 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          {keywords.map((kw) => (
            <span key={kw}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent
                text-xs font-medium rounded-full border border-accent/15 whitespace-nowrap">
              {kw}
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setKeywords((p) => p.filter((k) => k !== kw)); }}
                className="hover:text-red/80 transition">
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 4.293 8.146 1.146a.5.5 0 0 1 .708.708L5.707 5l3.147 3.146a.5.5 0 0 1-.708.708L5 5.707 1.854 8.854a.5.5 0 0 1-.708-.708L4.293 5 1.146 1.854a.5.5 0 1 1 .708-.708z" />
                </svg>
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={handleKwKey}
            onBlur={() => kwInput.trim() && addKeyword(kwInput)}
            placeholder={keywords.length === 0 ? "Job title, skill, keyword…  press Enter to add" : "Add more…"}
            className="flex-1 min-w-[140px] bg-transparent text-sm text-text outline-none placeholder:text-text2/40"
          />
        </div>

        {/* Location dropdown */}
        <div className="relative">
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-full pl-3 pr-7 bg-surface border border-border rounded-xl text-sm text-text
              appearance-none cursor-pointer focus:outline-none focus:border-accent/50
              focus:ring-2 focus:ring-accent/10 transition whitespace-nowrap"
          >
            {LOCATIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text2/50 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Action buttons */}
        {campaignRunning ? (
          <>
            <a href="/dashboard/campaign"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border
                border-green/30 bg-green/8 text-green hover:bg-green/15 transition whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              Watch Live
            </a>
            <button onClick={stopCampaign} disabled={busy !== null}
              className="px-4 py-2 text-sm font-medium rounded-xl border bg-red/8 text-red
                border-red/20 hover:bg-red/15 disabled:opacity-50 transition whitespace-nowrap">
              {busy === "stop" ? "Stopping…" : "Stop"}
            </button>
          </>
        ) : (
          <>
            <button onClick={findJobs} disabled={busy !== null}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface
                text-text hover:bg-surface2 hover:border-accent/40 disabled:opacity-50 transition whitespace-nowrap">
              {busy === "find" ? "Scanning…" : "Find Jobs"}
            </button>
            <button onClick={startCampaign} disabled={busy !== null}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl
                bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd" />
              </svg>
              {busy === "start" ? "Starting…" : "Start Campaign"}
            </button>
          </>
        )}
      </div>

      {/* ── Filter chips row ── */}
      <div className="flex flex-wrap items-center gap-2 px-1">

        {/* Job type chip */}
        <div className="relative">
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="appearance-none pl-3 pr-6 py-1 text-xs font-medium rounded-full border
              border-border bg-surface text-text2 cursor-pointer
              hover:border-accent/40 hover:text-text focus:outline-none focus:border-accent/50 transition"
          >
            {JOB_TYPES.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
          </select>
          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text2/50 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <span className="text-border">·</span>

        {/* Platform chips */}
        {PLATFORMS.map((p) => {
          const on = platforms.includes(p.id);
          return (
            <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
              className={[
                "flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition",
                on
                  ? "bg-accent/10 text-accent border-accent/25"
                  : "bg-surface text-text2/60 border-border hover:border-accent/30 hover:text-text2",
              ].join(" ")}
            >
              {p.autoApply && (
                <span className={["w-1.5 h-1.5 rounded-full", on ? "bg-accent/60" : "bg-green/50"].join(" ")} />
              )}
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {err && <p className="text-xs text-red px-1">{err}</p>}
    </div>
  );
}
