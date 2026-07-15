"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, LOCATIONS, JOB_TYPES } from "@/lib/constants";

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
  // A campaign auto-applies on exactly ONE platform (the extension runs it to the
  // daily cap, then stops) — so auto-apply is a radio, not a multi-select. Discovery
  // platforms (Glassdoor/Google/…) are multi-select; they only fetch listings.
  const [platforms, setPlatforms] = useState<string[]>(() => {
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
  const [err, setErr] = useState<string | null>(null);
  // Per-platform login state, reported by the extension (Indeed/ZipRecruiter).
  // Used only for the pre-flight guard in startCampaign — the visible connect
  // UI lives in the PlatformConnections panel, not in this row.
  const [connections, setConnections] = useState<Record<string, { status: string }>>({});

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

  const selectedAutoApply = platforms.find((p) => AUTO_APPLY_IDS.includes(p)) || "indeed";
  const selectedAutoName = PLATFORMS.find((p) => p.id === selectedAutoApply)?.name || selectedAutoApply;
  const selectedAutoStatus = connections[selectedAutoApply]?.status;

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

  // Persist the platform choice the moment it's clicked — without this a toggle
  // only sticks if the user happens to press Find Jobs / Start Campaign after.
  // Failures are silent: find/start re-save the full prefs anyway.
  async function persistPlatforms(next: string[]) {
    try {
      const t = await getFreshToken();
      await apiPost("/profile/prefs", t, { keywords, location, job_type: jobType, platforms: next });
    } catch { /* ignore — re-saved on find/start */ }
  }

  // Auto-apply is a radio: picking one auto-apply platform replaces the other.
  function selectAutoApply(id: string) {
    const next = [...platforms.filter((x) => !AUTO_APPLY_IDS.includes(x)), id];
    setPlatforms(next);
    void persistPlatforms(next);
  }

  // Discovery platforms are an independent multi-select (they only scrape listings).
  function toggleDiscovery(id: string) {
    const next = platforms.includes(id) ? platforms.filter((x) => x !== id) : [...platforms, id];
    setPlatforms(next);
    void persistPlatforms(next);
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
    // Auto-apply needs a logged-in account on the target platform. If the extension
    // told us the user is signed out, open the login/sign-up page instead of starting
    // a campaign that would just stall at a login wall.
    if (selectedAutoStatus === "logged_out") {
      setErr(`Sign into ${selectedAutoName} first — we opened the login page. Log in or create an account, then start.`);
      connectPlatform(selectedAutoApply);
      return;
    }
    setBusy("start"); setErr(null);
    try {
      const t = await getFreshToken();
      await savePrefs();
      await apiPost("/campaign/start", t, { keywords, platforms, location, job_type: jobType });

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
          filters: { keywords, platforms, location, job_type: jobType },
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

        <span className="text-[11px] font-medium text-text2/60 mr-0.5">Auto-apply on:</span>

        {/* Shine sweep across the active auto-apply chip (kept local — the chip
            is the only user of it). */}
        <style>{`@keyframes hdChipShine {
          0% { transform: translateX(-110%); }
          55%, 100% { transform: translateX(110%); }
        }`}</style>

        {/* Auto-apply platforms — a radio: exactly ONE platform runs a campaign,
            so picking one deselects the other. The active chip is filled, glowing
            and shimmering: this is THE control that decides where applications go.
            Account connection (log in / sign up / live status) lives in the
            PlatformConnections panel above; duplicating connect controls here
            just cluttered the row. */}
        {PLATFORMS.filter((p) => p.autoApply).map((p) => {
          const on = platforms.includes(p.id);
          return (
            <button key={p.id} type="button"
              onClick={() => selectAutoApply(p.id)}
              title={on
                ? `${p.name} — this campaign applies here`
                : `Switch auto-apply to ${p.name} (one platform per campaign)`}
              className={[
                "relative overflow-hidden flex items-center gap-2 px-4 py-1.5 text-sm rounded-full border transition",
                on
                  ? "bg-accent text-white border-accent font-semibold shadow-[0_0_16px_rgba(108,92,231,0.45)]"
                  : "bg-surface text-text2 border-border font-medium hover:border-accent/50 hover:text-text",
              ].join(" ")}
            >
              {on && (
                <span aria-hidden className="absolute inset-0 pointer-events-none"
                  style={{
                    animation: "hdChipShine 2.4s ease-in-out infinite",
                    background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
                  }} />
              )}
              {on && <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />}
              {p.name}
              {p.beta && (
                <span className={[
                  "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-full",
                  on ? "bg-white/20 text-white" : "bg-accent/10 text-accent",
                ].join(" ")}>
                  beta
                </span>
              )}
            </button>
          );
        })}

        <span className="text-border">·</span>

        <span className="text-[11px] font-medium text-text2/60 mr-0.5">Find jobs from:</span>

        {/* Discovery-only platforms — the backend can fetch their listings. Boards
            that are connectable but not yet fetchable (Monster/CareerBuilder/Dice)
            live only in the connections panel until their scraper/filler lands. */}
        {PLATFORMS.filter((p) => p.discovery && !p.autoApply).map((p) => {
          const on = platforms.includes(p.id);
          return (
            <button key={p.id} type="button"
              onClick={() => toggleDiscovery(p.id)}
              title={p.description + " — no account needed, just scrapes listings"}
              className={[
                "px-3.5 py-1.5 text-xs font-medium rounded-full border transition",
                on
                  ? "bg-surface2 text-text border-border/80"
                  : "bg-surface text-text2/50 border-border/50 hover:border-border hover:text-text2",
              ].join(" ")}
            >
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
