/**
 * Drop's support chat: POST /buddy/ask (streamed, parsed in lib/drop/stream.ts) and
 * POST /buddy/feedback. `checking` arrives only while the backend is really reading the
 * account, which is what sits Drop at his desk.
 */

import { API_BASE, ApiError, apiPost } from "@/lib/api";
import { readDropStream, type DropEvents, type DropReply } from "@/lib/drop/stream";

export type { DropEvents, DropProposal, DropReply, DropState } from "@/lib/drop/stream";
export type DropTurn = { role: "user" | "assistant"; text: string };

/** Something the chat did besides the text. "resume_pdf" = a new resume was just uploaded. */
export type DropAttachment = "resume_pdf";

export async function askDrop(
  token: string,
  question: string,
  history: DropTurn[],
  on: DropEvents = {},
  attachment?: DropAttachment,
): Promise<DropReply> {
  let tz: string | undefined;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old browser */ }

  const res = await fetch(`${API_BASE}/api/v1/buddy/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    // cards: the panel draws proposal cards, so Drop may offer them.
    body: JSON.stringify({ question, history, tz, cards: true, ...(attachment ? { attachment } : {}) }),
    cache: "no-store",
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || body.message || "I couldn't reach the server just now.");
  }
  return readDropStream(res.body, on);
}

/** A 👍/👎 on one answer, or what happened to one card. */
export type DropFeedback =
  | { turn_id: string; rating: "up" | "down" }
  | { turn_id: string; proposal_id: string; proposal_result: "accepted" | "dismissed" | "failed" };

export function sendDropFeedback(token: string, body: DropFeedback): Promise<unknown> {
  return apiPost("/buddy/feedback", token, body);
}
