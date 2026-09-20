"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { PLATFORMS } from "@/lib/constants";
import { checkExtensionPresent, detectBrowser, type BrowserKind } from "./StartReadiness";
import { isLiveConnected, type Conn } from "./PlatformsIndicator";

interface Props {
  onboardingComplete: boolean;
  hasResume: boolean;
  hasKeywords: boolean;
  // Either source counts: generated skill_groups or the typed skills_description.
  hasSkills: boolean;
  // How many job titles this user searches with — one keyword is one narrow sweep.
  keywordCount: number;
  // Approved-but-unsent Tap swipes (#185). Auto never picks these up, so they sit
  // forever until someone opens the deck — the sharpest "do this now" we have.
  approvedWaiting: number;
  submitMode?: string | null;
  // Usage, folded in from the old full-width UsageBanner card (Igor, 09-19:
  // "слишком большой он") — one line in the panel, plus a warning state on the
  // collapsed pill so a free user still sees the taste running out.
  tier: string;
  tierLabel: string;
  usedToday: number;
  dailyLimit: number;
  freeUsed?: number | null;
  freeLimit?: number | null;
}

const CONNECTABLE = PLATFORMS.filter((p) => p.connectable);
const COLLAPSE_KEY = "hd_dock_collapsed";
// Below this, more titles is the cheapest win available: each keyword is its own
// sweep of the boards, so one keyword is one narrow search.
const KEYWORDS_TARGET = 3;

type Item = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  href?: string;
  cta?: string;
  badge?: string;
  urgent?: boolean;
  onClick?: () => void;
};

/**
 * The left-hand dock: everything this user still has to do to get the most out of
 * HireDrop, as a small popup instead of a stack of full-width cards at the top of
 * the dashboard (Igor, 09-19).
 *
 * It is NOT an install checklist. Setup steps are in it because an unfinished
 * profile costs applications, but so is anything else that costs applications:
 * approved swipes nobody sent, one keyword where three would sweep three times as
 * much, two of three platforms logged out, cover letters in nobody's voice.
 *
 * Because of that it never unmounts itself — "all done" is a state it passes
 * through, not an exit. The collapsed pill carries whatever is most urgent
 * (stranded swipes, a free taste about to run out) so closing the dock doesn't
 * silence it.
 */
export default function ChecklistDock({
  onboardingComplete,
  hasResume,
  hasKeywords,
  hasSkills,
  keywordCount,
  approvedWaiting,
  submitMode,
  tier,
  tierLabel,
  usedToday,
  dailyLimit,
  freeUsed,
  freeLimit,
}: Props) {
  const profileDone = onboardingComplete && hasKeywords;

  const [open, setOpen] = useState(false);
  const [extPresent, setExtPresent] = useState<boolean | null>(null);
  const [browser, setBrowser] = useState<BrowserKind>("chromium");
  const [connections, setConnections] = useState<Record<string, Conn>>({});

  // Letter voice (profiles.writing_style) — moved here whole, editor included,
  // so the row didn't just become a link to a page that has no such field.
  const [letterStyle, setLetterStyle] = useState("");
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterDraft, setLetterDraft] = useState("");
  const [letterSaving, setLetterSaving] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("writing_style")
          .eq("user_id", user.id)
          .single();
        if (data?.writing_style) {
          setLetterStyle(data.writing_style);
          setLetterDraft(data.writing_style);
        }
      } catch { /* the row just reads "not set" */ }
    })();
  }, []);

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
  const platformsDone = connectedCount > 0;
  const allPlatformsDone = connectedCount === CONNECTABLE.length;
  const extDone = extPresent === true;
  const chromium = browser === "chromium";
  const probing = extPresent === null;

  // Stranded swipes are only stranded while the run isn't Tap (#185 reasoning:
  // an unknown mode still shows it — a link to the deck costs a tap user nothing).
  const swipesWaiting = submitMode === "tap" ? 0 : Math.max(0, approvedWaiting);

  const items: Item[] = [];

  if (swipesWaiting > 0) {
    const s = swipesWaiting === 1 ? "swipe" : "swipes";
    items.push({
      id: "swipes",
      label: `Send your ${swipesWaiting} approved ${s}`,
      hint: `Approved on the Tap deck. Auto searches job boards and never picks ${swipesWaiting === 1 ? "it" : "them"} up.`,
      done: false,
      urgent: true,
      href: "/dashboard/tap",
      cta: "Open deck",
    });
  }

  items.push(
    {
      id: "profile",
      label: "Complete your profile",
      hint: "Name, job keywords, location — the search runs off these.",
      done: profileDone,
      href: onboardingComplete ? "/dashboard/settings" : "/onboarding",
      cta: onboardingComplete ? "Edit" : "Start",
    },
    {
      id: "resume",
      label: "Upload your resume",
      hint: "Fills application forms and feeds every cover letter.",
      done: hasResume,
      href: "/dashboard/settings",
      cta: "Upload",
    },
    {
      id: "skills",
      label: "List your skills",
      hint: "Settings → Resume & ATS — builds a skills-first resume for ATS screens.",
      done: hasSkills,
      href: "/dashboard/settings",
      cta: "Describe",
    },
    {
      id: "keywords",
      label: "Add more job titles",
      hint: keywordCount <= 1
        ? `You search with ${keywordCount === 1 ? "one title" : "no titles"} — each extra one is another sweep of the boards.`
        : `${keywordCount} titles searched. Three or more keeps the daily cap fed.`,
      done: keywordCount >= KEYWORDS_TARGET,
      badge: `${keywordCount}`,
      href: "/dashboard/settings",
      cta: "Add",
    },
    {
      id: "extension",
      label: "Install the Chrome extension",
      hint: chromium
        ? "It's what actually submits. Install it, then reload this page."
        : browser === "mobile"
          ? "Applying runs in Chrome on your computer — finish this there."
          : "Open this page in Chrome to install the extension.",
      done: extDone,
      href: chromium ? "/extension" : undefined,
      cta: chromium ? "Get it" : undefined,
    },
    {
      id: "platforms",
      label: "Connect every job platform",
      hint: !extDone
        ? "Needs the extension first — it checks that you're logged in."
        : allPlatformsDone
          ? "All connected — the widest reach we can give you."
          : platformsDone
            ? "Each platform you log into is another board we can apply on."
            : "Log in to Indeed and ZipRecruiter so HireDrop can apply as you.",
      done: allPlatformsDone,
      badge: probing ? undefined : `${connectedCount}/${CONNECTABLE.length}`,
      href: extDone ? "/dashboard/platforms" : undefined,
      cta: extDone ? "Connect" : undefined,
    },
    {
      id: "letter",
      label: "Teach it your letter voice",
      hint: letterStyle
        ? `“${letterStyle.slice(0, 60)}${letterStyle.length > 60 ? "…" : ""}”`
        : "Without it every cover letter goes out in the same plain tone.",
      done: !!letterStyle,
      cta: letterStyle ? "Edit" : "Teach",
      onClick: () => {
        setLetterDraft(letterStyle);
        setLetterOpen((v) => !v);
      },
    },
  );

  // The two extension-bound items aren't actionable outside desktop Chromium —
  // don't hold the count against a visitor there (MobileHandoff explains where
  // applying actually runs).
  const counted = chromium ? items : items.filter((i) => i.id !== "extension" && i.id !== "platforms");
  const left = counted.filter((i) => !i.done).length;
  const doneCount = counted.length - left;
  const allDone = left === 0;
  const pct = Math.round((doneCount / counted.length) * 100);

  // Free taste (lifetime cap) — the one number a free user lives by.
  const hasFreeTaste = tier === "free" && typeof freeLimit === "number" && freeLimit > 0;
  const freeLeft = hasFreeTaste ? Math.max(0, freeLimit - Math.min(freeUsed ?? 0, freeLimit)) : 0;
  const freeWarning = hasFreeTaste && freeLeft <= 10;
  const isAdmin = tier === "admin";

  // Whatever the collapsed pill has to say for itself. Urgent first: shutting the
  // dock must not silence stranded swipes or a free taste about to run out.
  const pillNote = swipesWaiting > 0
    ? `${swipesWaiting} approved ${swipesWaiting === 1 ? "swipe" : "swipes"} waiting`
    : freeWarning
      ? freeLeft === 0 ? "Free applications used up" : `${freeLeft} free applications left`
      : allDone
        ? "Nothing left — you're at full reach"
        : "Do these for the most applications";
  const pillAlert = swipesWaiting > 0 || freeWarning;

  // Open by default while something is still worth doing, unless this browser
  // shut it before.
  useEffect(() => {
    if (probing) return;
    let collapsed = false;
    try { collapsed = localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { /* noop */ }
    if (!collapsed && !allDone) setOpen(true);
    // Only on the first resolved probe — later state changes must not re-open it.
  }, [probing]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "0" : "1"); } catch { /* noop */ }
      return next;
    });
  }

  const planLink = isAdmin
    ? { href: "/dashboard/ats-protocol", label: "ATS Protocol ↗" }
    : (tier === "free" || tier === "pro")
      ? { href: "/dashboard/settings?tab=billing", label: "Upgrade →" }
      : null;

  return (
    <div
      className="fixed z-40 bottom-4 left-4 lg:left-[252px] flex flex-col-reverse items-start gap-2 print:hidden"
      data-testid="checklist-dock"
    >
      {/* Collapsed pill — always present, so the list stays one click away */}
      <button
        type="button"
        onClick={toggle}
        data-testid="checklist-dock-toggle"
        className="hd-glass flex items-center gap-2.5 rounded-full pl-2 pr-3.5 py-2 shadow-lg shadow-black/5
          hover:border-accent/40 transition group"
      >
        {/* Progress ring */}
        <span className="relative flex items-center justify-center w-7 h-7 shrink-0">
          <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-surface2" />
            <circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round"
              stroke={allDone ? "var(--green, #16a34a)" : "var(--accent)"}
              strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute text-[9px] font-bold tabular-nums text-text">
            {allDone ? "✓" : left}
          </span>
        </span>

        <span className="text-left leading-tight">
          <span className="block text-[13px] font-semibold text-text">
            {allDone ? "Your checklist" : `${left} ${left === 1 ? "thing" : "things"} left to do`}
          </span>
          <span className={[
            "block text-[11px]",
            pillAlert ? "text-amber-600 font-semibold" : "text-text2/70",
          ].join(" ")}>
            {pillNote}
          </span>
        </span>

        <svg
          className={`w-3.5 h-3.5 text-text2/40 group-hover:text-accent transition ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          data-testid="setup-checklist"
          className="hd-glass w-[min(21rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl
            shadow-xl shadow-black/10"
          style={{ animation: "hdDockIn .18s ease" }}
        >
          <style>{`@keyframes hdDockIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

          {/* Header: what the list is for + the usage line that replaced the banner */}
          <div className="px-4 pt-3.5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text">
                {allDone ? "You're at full reach" : "For the most applications"}
              </p>

              {planLink && (
                <a
                  href={planLink.href}
                  className="ml-auto text-[11px] font-medium text-accent hover:text-accent2 whitespace-nowrap"
                >
                  {planLink.label}
                </a>
              )}

              <button
                type="button"
                onClick={toggle}
                aria-label="Close checklist"
                className={`${planLink ? "" : "ml-auto "}text-text2/50 hover:text-text transition`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mt-1 text-[11px] text-text2/80 flex flex-wrap items-center gap-x-1.5">
              <span className={isAdmin ? "font-semibold text-amber-600" : "font-semibold text-text2"}>
                {isAdmin ? "Admin ✦" : `${tierLabel} plan`}
              </span>
              <span>·</span>
              <span>
                {isAdmin
                  ? `${usedToday} applications today · unlimited`
                  : `${usedToday} / ${dailyLimit} applications today`}
              </span>
              {hasFreeTaste && (
                <>
                  <span>·</span>
                  <span className={freeWarning ? "text-amber-600 font-semibold" : ""}>
                    {freeLeft === 0 ? "free taste used up" : `${freeLeft} free left`}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {items.map((item, i) => {
              const inner = (
                <>
                  <span className={[
                    "mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    item.done
                      ? "bg-green/15 text-green"
                      : item.urgent
                        ? "bg-accent text-white"
                        : "bg-accent/10 text-accent border border-accent/20",
                  ].join(" ")}>
                    {item.done ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : item.urgent ? (
                      "!"
                    ) : (
                      i + 1
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-medium ${item.done ? "text-text2" : "text-text"}`}>
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-text2/70 leading-snug truncate">
                      {item.hint}
                    </span>
                  </span>

                  {item.badge && (
                    <span className={[
                      "shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
                      item.done
                        ? "bg-green/10 text-green border-green/20"
                        : "bg-surface2 text-text2 border-border",
                    ].join(" ")}>
                      {item.badge}
                    </span>
                  )}

                  {item.cta && (
                    <span className="shrink-0 text-[11px] font-semibold text-accent whitespace-nowrap">
                      {item.cta} →
                    </span>
                  )}
                </>
              );

              const cls = [
                "w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition",
                item.urgent ? "bg-accent-light hover:bg-accent-light/70" : "hover:bg-surface2/60",
              ].join(" ");

              return (
                <div key={item.id} data-testid={`checklist-step-${item.id}`}>
                  {item.onClick ? (
                    <button type="button" onClick={item.onClick} className={cls}>{inner}</button>
                  ) : item.href ? (
                    <a href={item.href} className={cls}>{inner}</a>
                  ) : (
                    <div className={`${cls} cursor-default`}>{inner}</div>
                  )}

                  {/* Letter voice editor, in place — same behaviour it had in QuickActions */}
                  {item.id === "letter" && letterOpen && (
                    <div className="px-4 pb-3.5 -mt-0.5">
                      <textarea
                        value={letterDraft}
                        onChange={(e) => setLetterDraft(e.target.value)}
                        rows={4}
                        maxLength={1500}
                        autoFocus
                        placeholder="Direct and warm. No buzzwords, no “I am writing to express my interest”. Lead with what I actually built."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px]
                          text-text placeholder:text-text2/40 focus:outline-none focus:border-accent/50"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={saveLetterStyle}
                          disabled={letterSaving}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white
                            hover:bg-accent2 disabled:opacity-50 transition"
                        >
                          {letterSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLetterOpen(false)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-text2 hover:text-text transition"
                        >
                          Cancel
                        </button>
                        <span className="ml-auto text-[10px] text-text2/50">{letterDraft.length}/1500</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
