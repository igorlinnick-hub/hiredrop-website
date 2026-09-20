"use client";

/*
  Drop's chat panel.

  Deliberately not a bubble-chat clone: Drop's answers are plain text on the
  surface (Linear/Raycast style) and only the user's own lines get a filled
  bubble. Two voices, one of them quiet — it reads as a product surface instead
  of a support widget.
*/

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BuddyOrb from "./BuddyOrb";

export type Msg = { role: "user" | "drop"; text: string };

export type AskFn = (question: string, history: Msg[]) => Promise<string>;

export default function BuddyPanel({
  greeting,
  suggestions,
  ask,
  onClose,
  onStateChange,
}: {
  greeting: string;
  suggestions: string[];
  ask: AskFn;
  onClose: () => void;
  onStateChange?: (s: "listening" | "thinking" | "speaking" | "idle") => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState<string | null>(null); // answer being revealed
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typed]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    onStateChange?.("thinking");

    let answer: string;
    try {
      answer = await ask(question, msgs);
    } catch (e) {
      answer = e instanceof Error ? e.message : "I couldn't reach the server just now.";
    }

    // Reveal the answer word by word — this is what drives Drop's "speaking" mood.
    onStateChange?.("speaking");
    const words = answer.split(" ");
    for (let i = 1; i <= words.length; i++) {
      setTyped(words.slice(0, i).join(" "));
      await new Promise((r) => setTimeout(r, 18));
    }
    setTyped(null);
    setMsgs((m) => [...m, { role: "drop", text: answer }]);
    setBusy(false);
    onStateChange?.("listening");
  }

  const empty = msgs.length === 0 && typed === null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      style={{
        transformOrigin: "bottom right",
        boxShadow: "0 24px 60px rgba(31,22,84,0.22), 0 4px 14px rgba(31,22,84,0.10)",
      }}
      className="w-[min(92vw,380px)] rounded-[26px] overflow-hidden flex flex-col
                 bg-surface border border-border"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <BuddyOrb size={34} state="idle" />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-text leading-tight">Drop</div>
          <div className="text-[11px] text-text/50 leading-tight">Knows your account</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="ml-auto w-7 h-7 rounded-full grid place-items-center
                     text-text/40 hover:text-text hover:bg-accent-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Conversation */}
      <div ref={scroller} className="px-4 py-4 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 360, minHeight: 190 }}>
        {empty && (
          <>
            <p className="text-[13.5px] leading-relaxed text-text/80">{greeting}</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[12px] px-3 py-1.5 rounded-full border border-border text-text/70
                             hover:border-accent hover:text-accent hover:bg-accent-light transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="self-end max-w-[85%]">
              <div className="bg-accent text-white text-[13.5px] leading-relaxed px-3.5 py-2 rounded-2xl rounded-br-md">
                {m.text}
              </div>
            </div>
          ) : (
            <p key={i} className="text-[13.5px] leading-relaxed text-text/85 whitespace-pre-wrap">
              {m.text}
            </p>
          )
        )}

        {typed !== null && (
          <p className="text-[13.5px] leading-relaxed text-text/85 whitespace-pre-wrap">
            {typed}
            <span className="inline-block w-[2px] h-[1em] align-[-2px] ml-0.5 bg-accent animate-pulse" />
          </p>
        )}

        <AnimatePresence>
          {busy && typed === null && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex gap-1 items-center h-4"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent/50"
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2
                        focus-within:border-accent transition-colors">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            placeholder="Ask about your account…"
            onFocus={() => onStateChange?.("listening")}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(84, e.target.scrollHeight) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
            }}
            className="flex-1 bg-transparent resize-none outline-none text-[13.5px] text-text
                       placeholder:text-text/35 leading-relaxed max-h-[84px]"
          />
          <button
            onClick={() => send(draft)}
            disabled={!draft.trim() || busy}
            aria-label="Send"
            className="shrink-0 w-7 h-7 rounded-full grid place-items-center bg-accent text-white
                       disabled:opacity-25 disabled:cursor-not-allowed hover:bg-accent-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <p className="text-[10.5px] text-text/35 text-center mt-2">
          Drop answers from your account and the HireDrop docs.
        </p>
      </div>
    </motion.div>
  );
}
