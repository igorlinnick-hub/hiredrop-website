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
  panel and nudge (BuddyBubble) load on first use, prefetched on hover/focus.
*/

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DropFigure from "./DropFigure";
import type { BuddyState } from "./BuddyOrb";
import type { AskFn } from "./BuddyPanel";

const loadBubble = () => import("./BuddyBubble");
const BuddyBubble = dynamic(loadBubble, { ssr: false });

const NUDGE_SEEN_KEY = "hd_drop_nudge_seen";

export default function Buddy({
  ask,
  greeting = "I can see your campaign, your platforms and your caps. Ask me anything about your account.",
  suggestions = ["Why no applications today?", "Which resume am I sending?", "Is this safe for my account?"],
  mood = "idle",
  nudge = null,
  working = false,
}: {
  ask: AskFn;
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

  // Mount the bubble the first time there is something to show, then keep it
  // mounted so closing the chat still plays its exit animation.
  const [bubbleUsed, setBubbleUsed] = useState(false);
  if ((open || showNudge) && !bubbleUsed) setBubbleUsed(true);

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
      {bubbleUsed && (
        <BuddyBubble
          open={open}
          nudge={showNudge ? nudge : null}
          greeting={greeting}
          suggestions={suggestions}
          ask={ask}
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
        onClick={() => { dismissNudge(); setOpen((o) => !o); }}
        onPointerEnter={loadBubble}
        onFocus={loadBubble}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
                   transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                   hover:scale-[1.08] active:scale-[0.93] active:duration-100
                   motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
      >
        <DropFigure size={116} state={state} working={working || (open && checking)} />
      </button>
    </div>
  );
}
