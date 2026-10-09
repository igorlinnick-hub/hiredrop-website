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
import DropFigure from "./DropFigure";
import type { DropAttachment, DropFeedback, DropProposal, DropReply } from "@/lib/buddy";
import { cardDestination, runSteps, withAnswer, type CardCall } from "@/lib/drop/cards";
import { describeFailure } from "@/lib/apiFailure";
import { resumeRejectReason } from "@/lib/useFileDrop";

/** A card's life in the chat. Only a click moves it out of "open". */
export type CardState = {
  card: DropProposal;
  status: "open" | "running" | "done" | "failed" | "dismissed";
  error?: string;
  /** The employer's fixed choices, when the answer has to be one of them. */
  options?: string[];
};

export type Msg = {
  role: "user" | "drop";
  text: string;
  /** Drop's turn on the server: what a 👍/👎 or a card outcome is filed under. */
  turnId?: string;
  cards?: CardState[];
  rating?: "up" | "down";
};

/** What the chat can do in the account, always on the person's own click. */
export type DropActions = {
  /** One authenticated request to /api/v1 (a card's step). */
  call: CardCall;
  navigate: (path: string) => void;
  /** Measurement only: a lost vote must never disturb the chat. */
  feedback: (body: DropFeedback) => void;
  /** Replace the uploaded resume; resolves null when it worked, else what went wrong. */
  uploadResume: (file: File) => Promise<string | null>;
};

export type PanelState = "listening" | "thinking" | "checking" | "speaking" | "idle";
/** Streams when it can: `onState`/`onText`/`onProposal` arrive while the answer is being
    written. An ask that resolves without streaming still works (the answer is revealed locally). */
export type AskFn = (
  question: string,
  history: Msg[],
  on: {
    onState: (s: "thinking" | "checking" | "speaking") => void;
    onText: (delta: string) => void;
    onProposal: (card: DropProposal) => void;
  },
  attachment?: DropAttachment,
) => Promise<DropReply>;

/** Drop writes plain text, but models slip into **bold** — render that, drop stray markers. */
function DropText({ text }: { text: string }) {
  const parts = text.replace(/^#+\s*/gm, "").split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4
          ? <strong key={i} className="font-semibold text-text">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export default function BuddyPanel({
  greeting,
  suggestions,
  ask,
  actions,
  onClose,
  onStateChange,
}: {
  greeting: string;
  suggestions: string[];
  ask: AskFn;
  /** Without it the chat only talks: cards show, but nothing can be pressed. */
  actions?: DropActions;
  onClose: () => void;
  onStateChange?: (s: PanelState) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState<string | null>(null); // answer being revealed
  const [checking, setChecking] = useState(false);          // a lookup is running server-side
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typed]);

  async function send(q: string, attachment?: DropAttachment) {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    onStateChange?.("thinking");

    let answer: string;
    let turnId: string | undefined;
    let streamed = "";
    const cards: CardState[] = [];
    try {
      const reply = await ask(question, msgs, {
        onState: (st) => { setChecking(st === "checking"); onStateChange?.(st); },
        onText: (d) => { streamed += d; setChecking(false); setTyped(streamed.trimStart()); },
        onProposal: (card) => { cards.push({ card, status: "open" }); },
      }, attachment);
      answer = reply.text;
      turnId = reply.turnId;
    } catch (e) {
      answer = e instanceof Error ? e.message : "I couldn't reach the server just now.";
      turnId = (e as { turnId?: string } | null)?.turnId;
    }
    setChecking(false);

    // A non-streaming ask (or an error) is revealed word by word here — that is what
    // drives Drop's "speaking" mood when no stream did.
    if (!streamed) {
      onStateChange?.("speaking");
      const words = answer.split(" ");
      for (let i = 1; i <= words.length; i++) {
        setTyped(words.slice(0, i).join(" "));
        await new Promise((r) => setTimeout(r, 18));
      }
    }
    setTyped(null);
    setMsgs((m) => [...m, { role: "drop", text: answer, turnId, cards: cards.length ? cards : undefined }]);
    setBusy(false);
    onStateChange?.("listening");
  }

  function patchMsg(index: number, patch: (m: Msg) => Msg) {
    setMsgs((all) => all.map((m, i) => (i === index ? patch(m) : m)));
  }

  function patchCard(index: number, cardId: string, patch: Partial<CardState>) {
    patchMsg(index, (m) => ({
      ...m,
      cards: m.cards?.map((c) => (c.card.id === cardId ? { ...c, ...patch } : c)),
    }));
  }

  /** The person pressed the card's button (or picked one of the employer's options). */
  async function press(index: number, state: CardState, answer?: string) {
    if (!actions || state.status === "running") return;
    const turnId = msgs[index]?.turnId;
    const card = answer ? withAnswer(state.card, answer) : state.card;
    patchCard(index, card.id, { status: "running", error: undefined, options: undefined });
    try {
      await runSteps(card.steps, actions.call);
      const to = cardDestination(card.navigate);
      if (to) actions.navigate(to);
      patchCard(index, card.id, { status: "done" });
      if (turnId) actions.feedback({ turn_id: turnId, proposal_id: card.id, proposal_result: "accepted" });
    } catch (e) {
      const why = describeFailure(e);
      patchCard(index, card.id, { status: "failed", error: why.message, options: why.options });
      if (turnId) actions.feedback({ turn_id: turnId, proposal_id: card.id, proposal_result: "failed" });
    }
  }

  function dismiss(index: number, state: CardState) {
    patchCard(index, state.card.id, { status: "dismissed" });
    const turnId = msgs[index]?.turnId;
    if (turnId && actions) actions.feedback({ turn_id: turnId, proposal_id: state.card.id, proposal_result: "dismissed" });
  }

  function rate(index: number, rating: "up" | "down") {
    const m = msgs[index];
    if (!m?.turnId || m.rating || !actions) return;
    patchMsg(index, (x) => ({ ...x, rating }));
    actions.feedback({ turn_id: m.turnId, rating });
  }

  /** A PDF from the paperclip: replace the resume, then tell Drop, who offers the next step. */
  async function attach(file: File) {
    if (!actions || busy) return;
    const refused = resumeRejectReason(file);
    if (refused) {
      setMsgs((m) => [...m, { role: "drop", text: refused }]);
      return;
    }
    setBusy(true);
    setUploading(true);
    onStateChange?.("thinking");
    const failed = await actions.uploadResume(file);
    setUploading(false);
    setBusy(false);
    if (failed) {
      setMsgs((m) => [...m, { role: "drop", text: failed }]);
      onStateChange?.("listening");
      return;
    }
    await send("I uploaded a new resume", "resume_pdf");
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
        <DropFigure size={34} state="idle" />
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
            <div key={i} className="flex flex-col gap-2">
              <p className="text-[13.5px] leading-relaxed text-text/85 whitespace-pre-wrap">
                <DropText text={m.text} />
              </p>
              {m.cards?.map((c) => (
                <ProposalCard
                  key={c.card.id}
                  state={c}
                  canPress={!!actions}
                  onPress={(answer) => press(i, c, answer)}
                  onDismiss={() => dismiss(i, c)}
                />
              ))}
              {m.turnId && actions && (
                <Rating value={m.rating} onRate={(r) => rate(i, r)} />
              )}
            </div>
          )
        )}

        {typed !== null && (
          <p className="text-[13.5px] leading-relaxed text-text/85 whitespace-pre-wrap">
            <DropText text={typed} />
            <span className="inline-block w-[2px] h-[1em] align-[-2px] ml-0.5 bg-accent animate-pulse" />
          </p>
        )}

        <AnimatePresence>
          {busy && typed === null && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex gap-1.5 items-center h-4"
            >
              {(checking || uploading) && (
                <span className="text-[12px] text-text/50 mr-1">
                  {uploading ? "Uploading your resume" : "Looking at your account"}
                </span>
              )}
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
          {actions && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                data-testid="drop-attach-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) attach(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                aria-label="Upload a new resume (PDF)"
                title="Upload a new resume (PDF)"
                className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-text/45
                           hover:text-accent hover:bg-accent-light disabled:opacity-25 disabled:cursor-not-allowed
                           transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9}
                    d="M18.4 11.6l-6.7 6.7a4.2 4.2 0 01-6-6l7.1-7.1a2.8 2.8 0 014 4l-7 7a1.4 1.4 0 01-2-2l6.3-6.3" />
                </svg>
              </button>
            </>
          )}
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

/** One card from Drop: the server's fixed title and lines, one button, and "Not now".
    Nothing runs until the button is pressed. */
function ProposalCard({
  state,
  canPress,
  onPress,
  onDismiss,
}: {
  state: CardState;
  canPress: boolean;
  onPress: (answer?: string) => void;
  onDismiss: () => void;
}) {
  const { card, status } = state;
  const settled = status === "done" || status === "dismissed";
  return (
    <div
      className="rounded-2xl border border-border bg-background px-3.5 py-3 space-y-2"
      data-testid="drop-card"
      data-status={status}
    >
      <p className="text-[13px] font-semibold leading-snug text-text">{card.title}</p>
      {card.lines.length > 0 && (
        <ul className="space-y-0.5">
          {card.lines.map((l, i) => (
            <li key={i} className="text-[12.5px] leading-snug text-text/75 break-words">{l}</li>
          ))}
        </ul>
      )}
      {card.note && <p className="text-[11.5px] leading-snug text-text/50">{card.note}</p>}

      {status === "done" && (
        <p className="text-[12.5px] leading-snug text-green" role="status">{card.done || "Done."}</p>
      )}
      {status === "dismissed" && (
        <p className="text-[12px] leading-snug text-text/45">Not now. Nothing changed.</p>
      )}
      {status === "failed" && state.error && (
        <p className="text-[12.5px] leading-snug text-red" role="alert">{state.error}</p>
      )}
      {status === "failed" && state.options && (
        <div className="flex flex-wrap gap-1.5">
          {state.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onPress(o)}
              className="text-[12px] px-2.5 py-1 rounded-full border border-border text-text/75
                         hover:border-accent hover:text-accent hover:bg-accent-light transition-colors"
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {canPress && !settled && !state.options && (
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onPress()}
            disabled={status === "running"}
            className="rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white
                       hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait transition-colors"
          >
            {status === "running" ? "Working…" : card.confirm}
          </button>
          {status !== "running" && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3 py-1.5 text-[12.5px] text-text/55 hover:text-text transition-colors"
            >
              Not now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 👍/👎 under one answer. One vote per answer: the board counts answers, not clicks. */
function Rating({ value, onRate }: { value?: "up" | "down"; onRate: (r: "up" | "down") => void }) {
  const btn = (r: "up" | "down", label: string, d: string) => (
    <button
      type="button"
      onClick={() => onRate(r)}
      disabled={!!value}
      aria-label={label}
      aria-pressed={value === r}
      title={label}
      className={[
        "w-6 h-6 rounded-full grid place-items-center transition-colors",
        value === r ? "text-accent" : "text-text/30",
        value ? "cursor-default" : "hover:text-text/70 hover:bg-accent-light",
      ].join(" ")}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
      </svg>
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 -ml-1" data-testid="drop-rating">
      {btn("up", "Helpful", "M7 11v9H4v-9h3zm0 0l4-8a2 2 0 012 2v4h5.2a2 2 0 012 2.3l-1.2 7A2 2 0 0117 20H7")}
      {btn("down", "Not helpful", "M17 13V4h3v9h-3zm0 0l-4 8a2 2 0 01-2-2v-4H5.8a2 2 0 01-2-2.3l1.2-7A2 2 0 017 4h10")}
      {value && <span className="text-[11px] text-text/40 ml-1">Thanks</span>}
    </div>
  );
}
