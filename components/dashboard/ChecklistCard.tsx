"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet, type StatsResponse, type CampaignStatusResponse } from "@/lib/api";

import { PLATFORMS } from "@/lib/constants";
import { checkExtensionPresent, detectBrowser, type BrowserKind } from "./StartReadiness";
import { isLiveConnected, type Conn } from "./PlatformsIndicator";

const CONNECTABLE = PLATFORMS.filter((p) => p.connectable);
// Below this, more titles is the cheapest win available: each keyword is its own
// sweep of the boards, so one keyword is one narrow search.
const KEYWORDS_TARGET = 3;

type Row = {
  id: string;
  label: string;
  // One short line saying what the item BUYS you. Kept to a few words: the rail is
  // 212px wide, and the first pass at full sentences just truncated into "…".
  hint: string;
  done: boolean;
  href?: string;
  badge?: string;
  urgent?: boolean;
  onClick?: () => void;
};

/**
 * "What's left to get the most applications", as a framed block at the bottom of
 * the nav rail (Igor, 09-19: in the sidebar next to Platforms/History/Extension,
 * lower, in its own frame — and one line per item, no paragraphs).
 *
 * It is NOT an install checklist. Setup steps are in it because an unfinished
 * profile costs applications, and so does everything else here: approved swipes
 * nobody sent, one keyword where three would sweep three times as much, two of
 * three platforms logged out, cover letters in nobody's voice.
 *
 * Self-fetching on purpose — it rides the layout, so every dashboard route gets
 * it without threading props through pages that don't care.
 */
export default function ChecklistCard({ demo = false }: { demo?: boolean } = {}) {
  // `demo` is for /preview/checklist only: with no session every row would read
  // undone, which shows neither the green ticks nor the urgent row.
  const [ready, setReady] = useState(demo);
  const [profileDone, setProfileDone] = useState(demo);
  const [hasResume, setHasResume] = useState(demo);
  const [hasSkills, setHasSkills] = useState(false);
  const [keywordCount, setKeywordCount] = useState(demo ? 1 : 0);
  const [letterStyle, setLetterStyle] = useState("");
  const [approvedWaiting, setApprovedWaiting] = useState(demo ? 4 : 0);
  const [submitMode, setSubmitMode] = useState<string | null>(null);
  const [tier, setTier] = useState("free");
  const [freeLeft, setFreeLeft] = useState<number | null>(null);

  const [extPresent, setExtPresent] = useState<boolean | null>(null);
  const [browser, setBrowser] = useState<BrowserKind>("chromium");
  const [connections, setConnections] = useState<Record<string, Conn>>({});

  const [letterOpen, setLetterOpen] = useState(false);
  const [letterDraft, setLetterDraft] = useState("");
  const [letterSaving, setLetterSaving] = useState(false);

  // Profile + backend state. Failures leave the card in its last good state
  // rather than claiming a step is undone.
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed, resume_url, keywords, skill_groups, skills_description, writing_style")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled || !data) return;
        const kw = (data.keywords ?? []) as string[];
        setKeywordCount(kw.length);
        setProfileDone(!!data.onboarding_completed && kw.length > 0);
        setHasResume(!!data.resume_url);
        setHasSkills(
          ((data.skill_groups ?? []) as unknown[]).length > 0 ||
          !!(data.skills_description ?? "").trim()
        );
        setLetterStyle(data.writing_style || "");
        setLetterDraft(data.writing_style || "");
        setReady(true);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token || cancelled) return;
        const [status, stats] = await Promise.allSettled([
          apiGet<CampaignStatusResponse>("/campaign/status", token),
          apiGet<StatsResponse>("/stats", token),
        ]);
        if (cancelled) return;
        if (status.status === "fulfilled") {
          setApprovedWaiting(status.value.approved_waiting ?? 0);
          setSubmitMode(status.value.submit_mode ?? null);
        }
        if (stats.status === "fulfilled") {
          setTier(stats.value.tier);
          if (stats.value.tier === "free" && typeof stats.value.free_limit === "number") {
            setFreeLeft(Math.max(0, stats.value.free_limit - (stats.value.free_used ?? 0)));
          }
        }
      } catch { /* keep whatever we already know */ }
    })();
    return () => { cancelled = true; };
  }, [demo]);

  // The two steps the server can't know: extension on THIS browser, platform logins.
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    const probe = () =>
      checkExtensionPresent().then((v) => {
        if (cancelled) return;
        setExtPresent(v);
        setBrowser(detectBrowser());
      });
    probe();

    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_PLATFORM_CONNECTIONS" && e.data.ok) {
        setConnections(e.data.connections || {});
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_PLATFORM_CONNECTIONS" }, "*");
    ask();
    const onVisible = () => {
      if (document.hidden) return;
      probe();
      ask();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const iv = setInterval(ask, 10000);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, [demo]);

  async function saveLetterStyle() {
    setLetterSaving(true);
    const next = letterDraft.trim();
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ writing_style: next }).eq("user_id", user.id);
        setLetterStyle(next);
        setLetterOpen(false);
      }
    } catch { /* keep the editor open so the text isn't lost */ }
    setLetterSaving(false);
  }

  const connectedCount = CONNECTABLE.filter((p) => isLiveConnected(connections[p.id])).length;
  const extDone = extPresent === true;
  const chromium = browser === "chromium";
  const probing = extPresent === null;
  // Swipes are only stranded while the run isn't Tap (#185).
  const swipes = submitMode === "tap" ? 0 : approvedWaiting;

  const rows: Row[] = [];
  if (swipes > 0) {
    rows.push({
      id: "swipes",
      label: `Send ${swipes} approved ${swipes === 1 ? "swipe" : "swipes"}`,
      hint: "Auto never picks them up",
      done: false,
      urgent: true,
      href: "/dashboard/tap",
    });
  }
  rows.push(
    {
      id: "profile",
      label: "Complete your profile",
      hint: "Keywords drive the search",
      done: profileDone,
      href: "/dashboard/settings",
    },
    {
      id: "resume",
      label: "Upload your resume",
      hint: "Fills forms, feeds letters",
      done: hasResume,
      href: "/dashboard/settings",
    },
    {
      id: "skills",
      label: "List your skills",
      hint: "Gets you past ATS screens",
      done: hasSkills,
      href: "/dashboard/settings",
    },
    {
      id: "keywords",
      label: "Add more job titles",
      hint: "Each title is another search",
      done: keywordCount >= KEYWORDS_TARGET,
      badge: ready ? `${keywordCount}` : undefined,
      href: "/dashboard/settings",
    },
    {
      id: "extension",
      label: "Install the extension",
      hint: chromium ? "It sends the applications" : "Finish this in Chrome",
      done: extDone,
      href: chromium ? "/extension" : undefined,
    },
    {
      id: "platforms",
      label: "Connect job platforms",
      hint: extDone ? "Each one is more jobs" : "Needs the extension first",
      done: connectedCount === CONNECTABLE.length,
      badge: probing ? undefined : `${connectedCount}/${CONNECTABLE.length}`,
      href: extDone ? "/dashboard/platforms" : undefined,
    },
    {
      id: "letter",
      label: "Teach your letter voice",
      hint: "Letters sound like you",
      done: !!letterStyle,
      onClick: () => { setLetterDraft(letterStyle); setLetterOpen(true); },
    },
  );

  // Outside desktop Chromium the two extension-bound rows aren't actionable —
  // don't count them (MobileHandoff explains where applying actually runs).
  const counted = chromium ? rows : rows.filter((r) => r.id !== "extension" && r.id !== "platforms");
  const left = counted.filter((r) => !r.done).length;
  const pct = Math.round(((counted.length - left) / counted.length) * 100);
  const freeWarning = tier === "free" && freeLeft !== null && freeLeft <= 10;

  return (
    <>
      <div
        className="rounded-xl border border-border bg-surface px-2.5 py-2.5"
        data-testid="setup-checklist"
      >
        {/* Header: what's left, and the bar that shows how far along it is */}
        <div className="flex items-baseline gap-1.5 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text">
            {left === 0 ? "All done" : `${left} left`}
          </span>
          <span className="text-[10px] text-text2/70">
            {left === 0 ? "full reach" : "for more applications"}
          </span>
        </div>
        <div className="mx-1 mt-1.5 h-1 rounded-full bg-text/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-text transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-1.5">
          {rows.map((row) => {
            const inner = (
              <>
                <span className={[
                  "mt-[3px] shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center",
                  row.done
                    ? "bg-green/15 text-green"
                    : row.urgent
                      ? "bg-text text-surface"
                      : "border border-text2/40",
                ].join(" ")}>
                  {row.done ? (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : row.urgent ? (
                    <span className="text-[8px] font-black leading-none">!</span>
                  ) : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={[
                    "block leading-snug",
                    row.done ? "text-text2/60" : row.urgent ? "font-semibold text-text" : "text-text",
                  ].join(" ")}>
                    {row.label}
                  </span>
                  {/* Done rows drop the hint — it only sells work you already did. */}
                  {!row.done && (
                    <span className="block text-[10.5px] leading-snug text-text2/70">
                      {row.hint}
                    </span>
                  )}
                </span>

                {row.badge && (
                  <span className={[
                    "mt-[3px] shrink-0 text-[10px] font-semibold tabular-nums",
                    row.done ? "text-green" : "text-text2/70",
                  ].join(" ")}>
                    {row.badge}
                  </span>
                )}
              </>
            );

            const cls = [
              "w-full flex items-start gap-2 rounded-lg px-1 py-1.5 text-left text-[12.5px] transition",
              row.urgent ? "bg-surface2 hover:bg-surface2/70" : "hover:bg-surface2/70",
            ].join(" ");

            return row.onClick ? (
              <button key={row.id} type="button" onClick={row.onClick} className={cls}
                data-testid={`checklist-step-${row.id}`}>{inner}</button>
            ) : (
              <a key={row.id} href={row.href} className={cls}
                data-testid={`checklist-step-${row.id}`}>{inner}</a>
            );
          })}
        </div>

        {/* Free taste — the number a free user lives by; paid tiers get nothing here. */}
        {freeLeft !== null && (
          <p className={[
            "mt-1 px-1 text-[10px]",
            freeWarning ? "font-semibold text-amber-600" : "text-text2/70",
          ].join(" ")}>
            {freeLeft === 0 ? "Free applications used up" : `${freeLeft} free applications left`}
          </p>
        )}
      </div>

      {/* Letter voice editor — a dialog, because the rail is too narrow to type in */}
      {letterOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setLetterOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-text">Letter voice</p>
            <p className="mt-0.5 text-xs text-text2">
              A line or two in your own words. Every cover letter is written to match it.
            </p>
            <textarea
              value={letterDraft}
              onChange={(e) => setLetterDraft(e.target.value)}
              rows={4}
              maxLength={1500}
              autoFocus
              placeholder="Direct and warm. No buzzwords, no “I am writing to express my interest”. Lead with what I actually built."
              className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                text-text placeholder:text-text2/40 focus:outline-none focus:border-accent/50"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={saveLetterStyle}
                disabled={letterSaving}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white
                  hover:bg-accent2 disabled:opacity-50 transition"
              >
                {letterSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setLetterOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-text2 hover:text-text transition"
              >
                Cancel
              </button>
              <span className="ml-auto text-[11px] text-text2/50">{letterDraft.length}/1500</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
