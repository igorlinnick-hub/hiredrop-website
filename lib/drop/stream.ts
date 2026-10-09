/**
 * Reading Drop's answer stream: POST /buddy/ask answers with NDJSON, one event a line.
 *   {type:"state", state:"thinking"|"checking"|"speaking"} · {type:"text", text} ·
 *   {type:"proposal", proposal:{…}} · {type:"done", turn_id} · {type:"error", message, turn_id}
 *
 * Pure (no fetch, no app imports) so the parser runs under `node --test` as is.
 */

export type DropState = "thinking" | "checking" | "speaking";

/** One request a card makes when the person presses it: built by the server from a fixed
 *  list of kinds (jobflow modules/buddy_actions.py), never by the model. */
export interface DropStep {
  method: string;
  path: string;
  body: unknown;
}

/** A card with one button. Every string on it comes from the server's fixed set. */
export interface DropProposal {
  id: string;
  kind: string;
  title: string;
  lines: string[];
  confirm: string;
  steps: DropStep[];
  navigate: string | null;
  note: string;
  done: string;
}

export type DropEvents = {
  onState?: (s: DropState) => void;
  onText?: (delta: string) => void;
  onProposal?: (card: DropProposal) => void;
};

/** The finished answer, and the id 👍/👎 and card outcomes are filed under. */
export interface DropReply {
  text: string;
  turnId?: string;
}

/** Drop's own "this broke" sentence, still tied to its turn so it can be rated. */
export class DropError extends Error {
  turnId?: string;
  constructor(message: string, turnId?: string) {
    super(message);
    this.name = "DropError";
    this.turnId = turnId;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** A proposal event as the panel can draw it, or null when it isn't one. */
export function asProposal(raw: unknown): DropProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = str(p.id);
  const title = str(p.title);
  const confirm = str(p.confirm);
  if (!id || !title || !confirm) return null;
  const steps = Array.isArray(p.steps) ? p.steps : [];
  return {
    id,
    kind: str(p.kind),
    title,
    lines: Array.isArray(p.lines) ? p.lines.filter((l): l is string => typeof l === "string" && !!l) : [],
    confirm,
    steps: steps
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s) => ({ method: str(s.method), path: str(s.path), body: s.body ?? null })),
    navigate: str(p.navigate) || null,
    note: str(p.note),
    done: str(p.done),
  };
}

/** Read the whole stream, calling `on` as events arrive. Throws DropError on an error
 *  event; resolves with the answer text and its turn id. */
export async function readDropStream(
  stream: ReadableStream<Uint8Array>,
  on: DropEvents = {},
): Promise<DropReply> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let turnId: string | undefined;

  const handle = (line: string) => {
    if (!line.trim()) return;
    let ev: { type?: string; state?: DropState; text?: string; message?: string; turn_id?: string; proposal?: unknown };
    try { ev = JSON.parse(line); } catch { return; /* a torn or foreign line carries nothing to show */ }
    if (typeof ev.turn_id === "string") turnId = ev.turn_id;
    if (ev.type === "state" && ev.state) on.onState?.(ev.state);
    else if (ev.type === "text" && ev.text) { text += ev.text; on.onText?.(ev.text); }
    else if (ev.type === "proposal") {
      const card = asProposal(ev.proposal);
      if (card) on.onProposal?.(card);
    } else if (ev.type === "error") {
      throw new DropError(ev.message || "Something broke on my side.", turnId);
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      handle(line);
    }
  }
  // The last event may arrive without a trailing newline.
  buf += decoder.decode();
  handle(buf);

  return { text: text.trim(), turnId };
}
