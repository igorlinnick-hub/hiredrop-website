"use client";

/*
  What floats above Drop: the chat panel or the one-line nudge.

  Split out of Buddy so framer-motion stays off the dashboard's first load — Drop
  sits on every dashboard page, but this only matters once someone opens the chat
  (or a nudge fires). Buddy loads it on demand and keeps it mounted afterwards, so
  the exit animations still play.
*/

import { AnimatePresence, motion } from "framer-motion";
import BuddyPanel, { type AskFn, type PanelState } from "./BuddyPanel";

export default function BuddyBubble({
  open,
  nudge,
  greeting,
  suggestions,
  ask,
  onClose,
  onStateChange,
  onNudgeOpen,
  onNudgeDismiss,
}: {
  open: boolean;
  /** The nudge text to show, or null. */
  nudge: string | null;
  greeting: string;
  suggestions: string[];
  ask: AskFn;
  onClose: () => void;
  onStateChange: (s: PanelState) => void;
  onNudgeOpen: () => void;
  onNudgeDismiss: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {open ? (
        <BuddyPanel
          key="panel"
          greeting={greeting}
          suggestions={suggestions}
          ask={ask}
          onClose={onClose}
          onStateChange={onStateChange}
        />
      ) : nudge ? (
        <motion.div
          key="nudge"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          style={{ transformOrigin: "bottom right", boxShadow: "0 12px 32px rgba(31,22,84,0.16)" }}
          className="relative max-w-[250px] bg-surface border border-border rounded-2xl rounded-br-md
                     px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text/85 cursor-pointer"
          onClick={onNudgeOpen}
        >
          {nudge}
          <button
            onClick={(e) => { e.stopPropagation(); onNudgeDismiss(); }}
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
  );
}
