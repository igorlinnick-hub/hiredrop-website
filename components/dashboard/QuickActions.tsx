"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, LOCATIONS, JOB_TYPES, WORK_SETTINGS } from "@/lib/constants";
import LaunchModal from "@/components/dashboard/LaunchModal";
import StartReadinessModal, { gateStart, type ReadinessCheck } from "@/components/dashboard/StartReadiness";
import RadiusMap, { type RadiusMiles } from "@/components/dashboard/RadiusMap";
import LaunchModeCards from "@/components/dashboard/LaunchModeCards";

// Platforms the extension can auto-apply on. Exactly one runs per campaign.
const AUTO_APPLY_IDS = PLATFORMS.filter((p) => p.autoApply).map((p) => p.id);
// All known platform ids — stored prefs may contain retired platforms (linkedin,
// craigslist); filter them out so they're never re-sent to the backend.
const KNOWN_IDS = PLATFORMS.map((p) => p.id);

interface Props {
  token: string;
  campaignRunning: boolean;
  keywords: string[];
  location: string;
  jobType: string;
  platforms: string[];
  onboardingComplete: boolean;
  hasResume: boolean;
  // Optional filters (moved out of the launch modal onto the dashboard).
  salaryMin?: number | null;
  salaryMax?: number | null;
  searchRadiusMiles?: number | null;
}

const RADIUS_STEPS = [10, 25, 50, 100];

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
  salaryMin: initialSalaryMin,
  // salaryMax intentionally unused — the filter is now a single "minimum pay" floor.
  searchRadiusMiles: initialRadius,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [location, setLocation] = useState(initialLocation || "remote");
  const [jobType, setJobType] = useState(initialJobType || "full-time");
  // Work setting (remote/hybrid/onsite) — a separate axis from job type. "" = Any.
  // Not persisted to profile (no column yet) — sent with the START payload for this run.
  const [workSetting, setWorkSetting] = useState("");
  // "Did you mean" typo suggestions for keywords — the ONE place a typo costs search
  // results (keywords go raw into board queries; the AI layers read the real posting so
  // they're already typo-tolerant). Shown as accept-with-one-click chips, never silent.
  const [typoSuggestions, setTypoSuggestions] = useState<{ original: string; suggestion: string }[]>([]);
  // A campaign auto-applies on exactly ONE platform (the extension runs it to the
  // daily cap, then stops) — so auto-apply is a radio, not a multi-select. Discovery
  // platforms (Glassdoor/Google/…) are multi-select; they only fetch listings.
  const [platforms] = useState<string[]>(() => {
    const stored = initialPlatforms.filter((x) => KNOWN_IDS.includes(x));
    const base = stored.length ? stored : ["indeed", "remoteok"];
    const selectedAuto = base.filter((x) => AUTO_APPLY_IDS.includes(x));
    if (selectedAuto.length === 0) base.push("indeed");
    else if (selectedAuto.length > 1) {
      const keep = selectedAuto[0];
      return [...new Set([...base.filter((x) => !AUTO_APPLY_IDS.includes(x)), keep])];
    }
    return [...new Set(base)];
  });
  const [kwInput, setKwInput] = useState("");
  const [campaignRunning, setCampaignRunning] = useState(initialCampaignRunning);
  const [busy, setBusy] = useState<Busy>(null);
  // Launch-time fit picker (replaces the Settings Apply-Mode panel): Start opens it,
  // the pick saves apply_mode, then the campaign actually starts.
  const [launchOpen, setLaunchOpen] = useState(false);
  // Start-readiness gate: failed preconditions shown as an "Almost there" checklist
  // (readiness endpoint + local extension PING) instead of a Start that no-ops.
  const [readyOpen, setReadyOpen] = useState(false);
  const [readyChecks, setReadyChecks] = useState<ReadinessCheck[]>([]);
  const [err, setErr] = useState<string | null>(null);
  // Per-platform login state, reported by the extension (Indeed/ZipRecruiter).
  // Used only for the pre-flight guard in startCampaign — the visible connect
  // UI lives in the PlatformConnections panel, not in this row.
  const [connections, setConnections] = useState<Record<string, { status: string }>>({});
  // Submit mode (profile.submit_mode): "auto" = fill + send for you; "tap" = you review +
  // approve each before it sends. Drives the daily cap + cover-letter model + the extension's
  // review-stop. Editable right here so the choice sits next to Start.
  const [mode, setMode] = useState<"auto" | "tap">("auto");

  // Optional filters (moved out of FitChoiceModal): salary range + non-remote radius.
  // Salary kept as raw strings (empty = no filter). Prefilled from the profile.
  // A single "minimum pay" floor is what job-seekers actually want (a Max would filter OUT
  // higher-paying jobs — never the goal). Stored/compared as ANNUAL USD on the backend;
  // the Year/Hour toggle only affects how the number is ENTERED (hour → ×2080 on save).
  const HOURS_PER_YEAR = 2080;
  const [salUnit, setSalUnit] = useState<"year" | "hour">("year");
  const [salMin, setSalMin] = useState(initialSalaryMin != null ? String(initialSalaryMin) : "");
  const [radius, setRadius] = useState<RadiusMiles | null>(
    initialRadius != null && RADIUS_STEPS.includes(initialRadius) ? (initialRadius as RadiusMiles) : null
  );

  // Poll /campaign/status every 5s so extension-started campaigns reflect in the UI
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const t = session?.access_token;
        if (!t) return;
        const status = await apiGet<{ running: boolean }>("/campaign/status", t);
        setCampaignRunning(status.running);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  // Load the saved submit mode so the toggle reflects the profile.
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("profiles").select("submit_mode").eq("user_id", user.id).single();
        if (data?.submit_mode === "tap") setMode("tap");
      } catch { /* ignore */ }
    })();
  }, []);

  // Persist the mode to the profile (optimistic; revert on failure).
  async function saveMode(next: "auto" | "tap") {
    if (next === mode) return;
    const prev = mode;
    setMode(next);
    // Mirror goTap's HIREDROP_SET_REVIEW: switching to Auto must ALSO clear the
    // extension's stored reviewMode. Without this, only Tap flipped it — so a
    // user who ran Tap then switched to Auto kept reviewMode=true in the
    // extension, and the campaign view showed the Tap review panel under Auto.
    window.postMessage({ type: "HIREDROP_SET_REVIEW", on: next === "tap" }, "*");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMode(prev); return; }
      const { error } = await supabase.from("profiles").update({ submit_mode: next }).eq("user_id", user.id);
      if (error) setMode(prev);
    } catch { setMode(prev); }
  }

  // Tap is its OWN experience: selecting it persists the mode + the current platform
  // selection, arms the extension's review-stop, and opens the dedicated /dashboard/tap
  // page (a clean card stack) rather than the auto campaign flow.
  async function goTap() {
    setMode("tap");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update({ submit_mode: "tap" }).eq("user_id", user.id);
    } catch { /* non-blocking */ }
    try { await savePrefs(); } catch { /* keep going — tap page falls back to profile */ }
    window.postMessage({ type: "HIREDROP_SET_REVIEW", on: true }, "*");
    router.push("/dashboard/tap");
  }

  // Ask the extension for platform login state (via the ping.js bridge) on mount,
  // on tab focus (the user may have just logged in on another tab), and periodically.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_PLATFORM_CONNECTIONS") {
        if (e.data.ok) setConnections(e.data.connections || {});
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_PLATFORM_CONNECTIONS" }, "*");
    ask();
    const onVisible = () => { if (!document.hidden) ask(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const iv = setInterval(ask, 10000);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, []);

  // The auto-apply target defaults to the first auto-apply platform on the profile;
  // the launch modal lets the user pick today's target explicitly at Start.
  const selectedAutoApply = platforms.find((p) => AUTO_APPLY_IDS.includes(p)) || "indeed";

  function connectPlatform(id: string) {
    // Open the platform's auth page directly (a click is a user gesture, so it isn't
    // popup-blocked). content.js on that page then detects and stores the new login
    // state. We don't route through the extension's service worker — it can go stale.
    const url = PLATFORMS.find((p) => p.id === id)?.loginUrl;
    if (url) window.open(url, "_blank", "noopener");
  }

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

  // Debounced typo check for the keyword list (cheap Haiku call server-side). Fail-open:
  // any error just yields no suggestions and the search runs with keywords as typed.
  useEffect(() => {
    if (!keywords.length) { setTypoSuggestions([]); return; }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const t = await getFreshToken();
        const res = await apiPost<{ corrections: { original: string; suggestion: string }[] }>(
          "/tools/normalize-keywords", t, { keywords });
        if (!cancelled) setTypoSuggestions((res.corrections || []).filter((c) => keywords.includes(c.original)));
      } catch { if (!cancelled) setTypoSuggestions([]); }
    }, 700);
    return () => { cancelled = true; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords]);

  function applyTypoFix(original: string, suggestion: string) {
    setKeywords((p) => (p.includes(suggestion) ? p.filter((k) => k !== original) : p.map((k) => (k === original ? suggestion : k))));
    setTypoSuggestions((s) => s.filter((c) => c.original !== original));
  }
  function dismissTypoFix(original: string) {
    setTypoSuggestions((s) => s.filter((c) => c.original !== original));
  }

  // ── optional filters: salary + radius (fire-and-forget, never block Start) ────
  const boundSalary = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  async function persistSalary(min: string, unit: "year" | "hour") {
    try {
      const t = await getFreshToken();
      const raw = boundSalary(min);
      // Normalize to ANNUAL USD (the backend's unit) before saving.
      const annual = raw == null ? null : unit === "hour" ? raw * HOURS_PER_YEAR : raw;
      await apiPost("/profile/salary", t, {
        salary_min: annual,
        salary_max: null, // no upper bound — a job-seeker never wants to exclude higher pay
        salary_listed_only: false,
      });
    } catch { /* optional filter — ignore */ }
  }
  function selectRadius(miles: RadiusMiles) {
    setRadius(miles);
    (async () => {
      try {
        const t = await getFreshToken();
        await apiPost("/profile/radius", t, { search_radius_miles: miles });
      } catch { /* optional filter — ignore */ }
    })();
  }
  // A city picked on the map becomes the campaign location (a precise city string,
  // not the coarse remote/usa/europe enum) — it flows to Indeed l= via the extension.
  // Save the label directly (not from state, which updates async) so the write is fresh.
  function pickLocation(label: string) {
    setLocation(label);
    (async () => {
      try {
        const t = await getFreshToken();
        await apiPost("/profile/prefs", t, { keywords, location: label, job_type: jobType, platforms });
      } catch { /* optional filter — ignore */ }
    })();
  }
  // Switching to a non-remote location with no radius yet → commit a sensible
  // default (25 mi) so the highlighted chip reflects what's actually saved.
  useEffect(() => {
    if (location !== "remote" && radius == null) selectRadius(25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // ── save + execute ─────────────────────────────────────────────────────────

  async function getFreshToken(): Promise<string> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    // Session gone — force re-login
    router.push("/login");
    throw new Error("Session expired — please log in again");
  }

  async function savePrefsWith(plats: string[]) {
    const t = await getFreshToken();
    await apiPost("/profile/prefs", t, { keywords, location, job_type: jobType, platforms: plats });
  }

  async function savePrefs() {
    await savePrefsWith(platforms);
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

  // Click-Start gate: everything ready -> LAUNCH modal (pick today's platform) -> start;
  // otherwise the "Almost there" checklist. Fit strictness is a dashboard control now,
  // not a per-start popup.
  async function ensureReadyThenLaunch() {
    if (busy) return;
    try {
      const t = await getFreshToken();
      const r = await gateStart(t);
      if (r.ready) { setLaunchOpen(true); return; }
      setReadyChecks(r.checks);
      setReadyOpen(true);
    } catch {
      setLaunchOpen(true); // fail-open; extension start guards remain the backstop
    }
  }

  // Deep-link actions for the checklist rows.
  function fixReadiness(fix: string) {
    setReadyOpen(false);
    if (fix === "keywords") { inputRef.current?.focus(); return; }
    if (fix === "tap") { void goTap(); return; }
    if (fix === "settings") { router.push("/dashboard/settings"); return; }
    if (fix === "upgrade") { router.push("/dashboard/settings?tab=billing"); return; }
    if (fix === "onboarding") { router.push("/onboarding"); return; }
    if (fix === "campaign") { router.push("/dashboard/campaign"); return; }
    if (fix === "extension") { router.push("/extension"); return; }
  }

  async function startCampaign(overridePlatform?: string) {
    // Effective platform list: the launch-modal pick (auto-apply target) + any discovery
    // sources already on the profile. Falls back to state when no override is passed.
    const effPlatforms = overridePlatform
      ? [overridePlatform, ...platforms.filter((x) => !AUTO_APPLY_IDS.includes(x))]
      : platforms;
    if (!onboardingComplete) { setErr("Complete your profile setup first — click \"Start setup\" above."); return; }
    if (!keywords.length) { setErr("Add at least one keyword"); inputRef.current?.focus(); return; }
    if (!effPlatforms.length) { setErr("Select at least one platform"); return; }
    // Auto-apply needs a logged-in account on the target platform. If the extension
    // told us the user is signed out, open the login/sign-up page instead of starting
    // a campaign that would just stall at a login wall.
    const tgt = overridePlatform || selectedAutoApply;
    if (connections[tgt]?.status === "logged_out") {
      const tgtName = PLATFORMS.find((p) => p.id === tgt)?.name || tgt;
      setErr(`Sign into ${tgtName} first — we opened the login page. Log in or create an account, then start.`);
      connectPlatform(tgt);
      return;
    }
    setBusy("start"); setErr(null);
    try {
      const t = await getFreshToken();
      await savePrefsWith(effPlatforms);
      await apiPost("/campaign/start", t, { keywords, platforms: effPlatforms, location, job_type: jobType });

      // Ask the extension to launch, and WAIT for its verdict: it can refuse (e.g.
      // pre-flight found the target platform logged out). Ignoring that left a
      // zombie state — backend "running", extension idle. Timeout = extension
      // absent or an old ping.js that doesn't answer: proceed as before.
      const verdict = await new Promise<{ ok: boolean; message?: string } | null>((resolve) => {
        let done = false;
        const finish = (v: { ok: boolean; message?: string } | null) => {
          if (done) return;
          done = true;
          window.removeEventListener("message", onMsg);
          resolve(v);
        };
        function onMsg(e: MessageEvent) {
          if (e.source !== window || !e.data || typeof e.data !== "object") return;
          if (e.data.type === "HIREDROP_CAMPAIGN_STARTED") {
            finish({ ok: !!e.data.ok, message: e.data.message || e.data.error });
          }
        }
        window.addEventListener("message", onMsg);
        window.postMessage({
          type: "HIREDROP_START_CAMPAIGN",
          filters: { keywords, platforms: effPlatforms, location, job_type: jobType, work_setting: workSetting, search_radius_miles: radius },
        }, "*");
        setTimeout(() => finish(null), 5000);
      });

      if (verdict && !verdict.ok) {
        // Roll the backend back so status doesn't show a campaign nothing is running.
        await apiPost("/campaign/stop", t, {}).catch(() => {});
        setErr(verdict.message || "The extension couldn't start the campaign.");
        setBusy(null);
        return;
      }

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
    <div className="mb-6 space-y-3">

      {/* How you apply — the primary choice, up top as two big cards. Hidden while a
          campaign is running (mode is a pre-launch decision). */}
      {!campaignRunning && (
        <LaunchModeCards mode={mode} onAuto={() => saveMode("auto")} onTap={goTap} />
      )}

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
            {/* A city picked on the map isn't one of the 3 base options — surface it
                as a selected entry so the dropdown shows it instead of going blank. */}
            {location && !LOCATIONS.some((l) => l.value === location) && (
              <option value={location}>{location}</option>
            )}
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

            {/* Primary action is mode-aware: Auto starts the campaign here; Tap opens
                the dedicated tap page (its own Start lives there). Prevents the "auto
                started with tap mode" trap. */}
            <button onClick={mode === "tap" ? goTap : ensureReadyThenLaunch} disabled={busy !== null}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl
                bg-accent text-white hover:bg-accent2 disabled:opacity-50 transition shadow-sm whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd" />
              </svg>
              {mode === "tap" ? "Open Tap" : (busy === "start" ? "Starting…" : "Start Campaign")}
            </button>
          </>
        )}
      </div>

      {/* "Did you mean" — one-click typo fixes for keywords (search-only; the AI understands
          typos, but the board search doesn't reliably). Never rewrites silently. */}
      {typoSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {typoSuggestions.map((c) => (
            <span key={c.original}
              className="inline-flex items-center gap-1.5 rounded-full border border-yellow/30 bg-yellow/[0.07]
                px-2.5 py-1 text-xs text-text2">
              <span className="text-text2/70">Did you mean</span>
              <button
                onClick={() => applyTypoFix(c.original, c.suggestion)}
                className="font-semibold text-accent hover:underline"
                title={`Replace "${c.original}" with "${c.suggestion}"`}
              >
                {c.suggestion}
              </button>
              <span className="text-text2/50">?</span>
              <button
                onClick={() => dismissTypoFix(c.original)}
                className="ml-0.5 text-text2/40 hover:text-text2 transition"
                title="Keep it as typed"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 4.293 8.146 1.146a.5.5 0 0 1 .708.708L5.707 5l3.147 3.146a.5.5 0 0 1-.708.708L5 5.707 1.854 8.854a.5.5 0 0 1-.708-.708L4.293 5 1.146 1.854a.5.5 0 1 1 .708-.708z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

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

        {/* Work setting chip (remote / hybrid / on-site) — separate axis from job type */}
        <div className="relative">
          <select
            value={workSetting}
            onChange={(e) => setWorkSetting(e.target.value)}
            className="appearance-none pl-3 pr-6 py-1 text-xs font-medium rounded-full border
              border-border bg-surface text-text2 cursor-pointer
              hover:border-accent/40 hover:text-text focus:outline-none focus:border-accent/50 transition"
          >
            {WORK_SETTINGS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text2/50 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <span className="text-border">·</span>

        {/* Minimum pay (optional). A single floor is what job-seekers actually want — a Max
            would exclude higher-paying jobs. Stored as annual USD; the Year/Hour toggle only
            changes entry (hour → ×2080 on save). We skip jobs that LIST pay below this;
            postings with no listed salary are still included. Fire-and-forget on blur/toggle. */}
        <span className="text-[11px] font-medium text-text2/60" title="We skip jobs that list pay below this. Postings without a listed salary are still included.">
          Min pay
        </span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface pl-2 pr-1 py-0.5">
          <span aria-hidden className="text-[11px] text-text2/50">$</span>
          <input type="number" inputMode="numeric" min={0} step={salUnit === "hour" ? 1 : 5000}
            placeholder={salUnit === "hour" ? "e.g. 45" : "e.g. 90000"}
            value={salMin}
            onChange={(e) => setSalMin(e.target.value)}
            onBlur={() => persistSalary(salMin, salUnit)}
            className="w-[4.75rem] bg-transparent text-xs text-text placeholder:text-text2/40 outline-none tabular-nums" />
          {/* Year / Hour toggle */}
          <div className="flex items-center rounded-full bg-surface2/60 p-0.5 text-[10px] font-semibold">
            {(["year", "hour"] as const).map((u) => (
              <button key={u} type="button"
                onClick={() => { setSalUnit(u); persistSalary(salMin, u); }}
                className={[
                  "px-1.5 py-0.5 rounded-full transition",
                  salUnit === u ? "bg-accent text-white" : "text-text2/60 hover:text-text",
                ].join(" ")}
              >
                {u === "year" ? "/yr" : "/hr"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search area — only for non-remote searches. Live map + city search + a
          10/25/50/100-mile radius; city → profile.location, radius → search_radius_miles. */}
      {location !== "remote" && (
        <div className="px-1 max-w-sm" style={{ animation: "hdRadiusIn .25s ease" }}>
          <style>{`@keyframes hdRadiusIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
          <RadiusMap
            value={radius}
            onChange={selectRadius}
            onPick={pickLocation}
            areaLabel={LOCATIONS.find((l) => l.value === location)?.label ?? location}
            initialQuery={LOCATIONS.some((l) => l.value === location) ? undefined : location}
          />
        </div>
      )}

      {/* Error. `context_invalidated` isn't a real failure — it means the extension was
          just reloaded/updated and this tab still holds the dead content-script bridge.
          Show a friendly, actionable banner (refresh reconnects) instead of raw red text. */}
      {err && (/context_invalidated/.test(err) ? (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2 text-xs text-text2">
          <svg className="w-4 h-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="flex-1">The HireDrop extension was just updated — refresh this tab to reconnect.</span>
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-lg bg-accent px-2.5 py-1 font-semibold text-white hover:bg-accent2 transition"
          >
            Refresh
          </button>
        </div>
      ) : (
        <p className="text-xs text-red px-1">{err}</p>
      ))}

      {/* Start flow: readiness checklist if something's missing, else the launch
          platform picker → startCampaign(picked). */}
      <StartReadinessModal
        open={readyOpen}
        onClose={() => setReadyOpen(false)}
        checks={readyChecks}
        onFix={fixReadiness}
      />

      <LaunchModal
        open={launchOpen}
        current={selectedAutoApply}
        connections={connections}
        onClose={() => setLaunchOpen(false)}
        onLaunch={(platformId) => { setLaunchOpen(false); void startCampaign(platformId); }}
      />
    </div>
  );
}
