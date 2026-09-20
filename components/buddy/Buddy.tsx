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
*/

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BuddyOrb, { type BuddyState } from "./BuddyOrb";
import BuddyPanel, { type AskFn } from "./BuddyPanel";

const NUDGE_SEEN_KEY = "hd_drop_nudge_seen";

export default function Buddy({
  ask,
  greeting = "I can see your campaign, your platforms and your caps. Ask me anything about your account.",
  suggestions = ["Why no applications today?", "Which resume am I sending?", "Is this safe for my account?"],
  mood = "idle",
  nudge = null,
}: {
  ask: AskFn;
  greeting?: string;
  suggestions?: string[];
  mood?: Extract<BuddyState, "idle" | "success" | "stuck">;
  nudge?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [chatState, setChatState] = useState<BuddyState | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  // The nudge appears once per nudge text, after a beat, and never again once
  // it's been dismissed or the chat has been opened.
  useEffect(() => {
    if (!nudge || open) { setShowNudge(false); return; }
    let seen: string | null = null;
    try { seen = localStorage.getItem(NUDGE_SEEN_KEY); } catch { /* private mode */ }
    if (seen === nudge) return;
    const t = setTimeout(() => setShowNudge(true), 2200);
    return () => clearTimeout(t);
  }, [nudge, open]);

  function dismissNudge() {
    setShowNudge(false);
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
      <AnimatePresence mode="wait">
        {open ? (
          <BuddyPanel
            key="panel"
            greeting={greeting}
            suggestions={suggestions}
            ask={ask}
            onClose={() => { setOpen(false); setChatState(null); }}
            onStateChange={(s) => setChatState(s as BuddyState)}
          />
        ) : showNudge ? (
          <motion.div
            key="nudge"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{ transformOrigin: "bottom right", boxShadow: "0 12px 32px rgba(31,22,84,0.16)" }}
            className="relative max-w-[250px] bg-surface border border-border rounded-2xl rounded-br-md
                       px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text/85 cursor-pointer"
            onClick={() => { dismissNudge(); setOpen(true); }}
          >
            {nudge}
            <button
              onClick={(e) => { e.stopPropagation(); dismissNudge(); }}
              aria-label="Dismiss"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-surface border border-border
                         grid place-items-center text-text/40 hover:text-text"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        aria-label={open ? "Close Drop" : "Ask Drop"}
        aria-expanded={open}
        onClick={() => { dismissNudge(); setOpen((o) => !o); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <BuddyOrb size={58} state={state} />
      </motion.button>
    </div>
  );
}
