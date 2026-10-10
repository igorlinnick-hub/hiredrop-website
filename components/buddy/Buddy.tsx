"use client";

/*
  Drop — the floating character + its chat.

  Mood is driven by two things at once:
    · the product   — passed in as `mood` (a run finished → success, a campaign
                      stalled → stuck). This is the half a chat widget can't do.
    · the conversation — listening / thinking / speaking while the panel is open.

  A nudge is a one-line teaser Drop shows on its own. Rule: it only ever appears
  when something is actually WRONG and Drop can fix it — never "Hi! Need help?".
  A widget that interrupts to sell itself is the reason people hate these.

  Drop is on every dashboard page, so this file stays free of framer-motion: the
  panel and nudge (BuddyBubble) load after the page is idle, or sooner on
  hover/focus/open.

  Loaded by hand, not with next/dynamic: a lazy component whose chunk fails to
  arrive (offline, flaky mobile) THROWS on render, and the nearest boundary is the
  dashboard's error page — tapping Drop would take the whole page down. Here a
  failed load just says so next to Drop and the next tap tries again.
*/

import { useEffect, useState } from "react";
import DropFigure from "./DropFigure";
import type { BuddyState } from "./BuddyOrb";
import type { AskFn, DropActions } from "./BuddyPanel";

type BubbleComponent = typeof import("./BuddyBubble").default;

let bubbleLoad: Promise<BubbleComponent> | null = null;
function loadBubble(): Promise<BubbleComponent> {
  bubbleLoad ??= import("./BuddyBubble")
    .then((m) => m.default)
    .catch((e) => { bubbleLoad = null; throw e; }); // forget a failure so a retry refetches
  return bubbleLoad;
}
const prefetchBubble = () => { loadBubble().catch(() => { /* the open path reports it */ }); };

const NUDGE_SEEN_KEY = "hd_drop_nudge_seen";

export default function Buddy({
  ask,
  actions,
  greeting = "I can see your campaign, your platforms and your caps. Ask me anything about your account.",
  suggestions = ["Why no applications today?", "Which resume am I sending?", "Is this safe for my account?"],
  mood = "idle",
  nudge = null,
  working = false,
}: {
  ask: AskFn;
  actions?: DropActions;
  greeting?: string;
  suggestions?: string[];
  mood?: Extract<BuddyState, "idle" | "success" | "stuck">;
  nudge?: string | null;
  /** A campaign is actually running (server says so) — Drop sits at the desk. */
  working?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [chatState, setChatState] = useState<BuddyState | null>(null);
  // The backend is reading the account right now — Drop works at the desk meanwhile.
  const [checking, setChecking] = useState(false);
  // Which nudge text is currently armed to show. Holding the TEXT rather than a
  // boolean means the effect never has to clear it synchronously — changing the
  // nudge or opening the chat simply makes the value stop matching.
  const [armed, setArmed] = useState<string | null>(null);

  // The nudge appears once per nudge text, after a beat, and never again once
  // it's been dismissed or the chat has been opened.
  useEffect(() => {
    if (!nudge || open) return;
    let seen: string | null = null;
    try { seen = localStorage.getItem(NUDGE_SEEN_KEY); } catch { /* private mode */ }
    if (seen === nudge) return;
    const t = setTimeout(() => setArmed(nudge), 2200);
    return () => clearTimeout(t);
  }, [nudge, open]);

  const showNudge = !open && !!nudge && armed === nudge;

  // The bubble component once its chunk has arrived. It stays mounted from then
  // on, so closing the chat still plays the exit animation.
  const [Bubble, setBubble] = useState<BubbleComponent | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Fetch it once the page has settled — off the first load, but usually in hand
  // before anyone taps Drop (a touch screen has no hover to warn us).
  useEffect(() => {
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(prefetchBubble, { timeout: 4000 })
      : window.setTimeout(prefetchBubble, 2500);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  const wanted = open || showNudge;
  useEffect(() => {
    if (!wanted || Bubble) return;
    let alive = true;
    loadBubble().then(
      (c) => { if (alive) setBubble(() => c); },
      () => {
        if (!alive) return;
        setOpen(false);
        setLoadFailed(true);
      },
    );
    return () => { alive = false; };
  }, [wanted, Bubble]);

  function dismissNudge() {
    setArmed(null);
    try { if (nudge) localStorage.setItem(NUDGE_SEEN_KEY, nudge); } catch { /* noop */ }
  }

  const state: BuddyState = open ? (chatState ?? "listening") : mood;

  return (
    <div
      className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3
                 max-[640px]:bottom-24"
      /* Below 640px the tap dock spans the screen at bottom:18px, so Drop sits
         above it rather than on top of it. */
    >
      {loadFailed && !open && (
        <p
          role="status"
          className="max-w-[250px] bg-surface border border-border rounded-2xl rounded-br-md
                     px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text/85 shadow-lg"
        >
          The chat didn&apos;t load. Check your connection and tap me again.
        </p>
      )}

      {Bubble && (
        <Bubble
          open={open}
          nudge={showNudge ? nudge : null}
          greeting={greeting}
          suggestions={suggestions}
          ask={ask}
          actions={actions}
          onClose={() => { setOpen(false); setChatState(null); setChecking(false); }}
          onStateChange={(s) => {
            setChecking(s === "checking");
            setChatState((s === "checking" ? "thinking" : s) as BuddyState);
          }}
          onNudgeOpen={() => { dismissNudge(); setOpen(true); }}
          onNudgeDismiss={dismissNudge}
        />
      )}

      <button
        aria-label={open ? "Close Drop" : "Ask Drop"}
        aria-expanded={open}
        onClick={() => { dismissNudge(); setLoadFailed(false); setOpen((o) => !o); }}
        onPointerEnter={prefetchBubble}
        onFocus={prefetchBubble}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2
                   transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                   hover:scale-[1.08] active:scale-[0.93] active:duration-100
                   motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
      >
        {/* 116px on a phone covers the right third of a form field; 72 keeps it a button. */}
        <DropFigure
          size={116}
          className="max-[640px]:size-[72px]!"
          state={state}
          working={working || (open && checking)}
        />
      </button>
    </div>
  );
}
