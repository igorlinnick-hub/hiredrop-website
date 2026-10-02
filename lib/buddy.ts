/**
 * Drop's support chat — POST /buddy/ask streams NDJSON events:
 *   {type:"state", state:"thinking"|"checking"|"speaking"} · {type:"text", text} ·
 *   {type:"done"} · {type:"error", message}
 * `checking` arrives only while the backend is really reading the account, which is
 * what sits Drop at his desk.
 */

import { API_BASE, ApiError } from "@/lib/api";

export type DropState = "thinking" | "checking" | "speaking";
export type DropEvents = { onState?: (s: DropState) => void; onText?: (delta: string) => void };
export type DropTurn = { role: "user" | "assistant"; text: string };

export async function askDrop(
  token: string,
  question: string,
  history: DropTurn[],
  on: DropEvents = {},
): Promise<string> {
  let tz: string | undefined;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old browser */ }

  const res = await fetch(`${API_BASE}/api/v1/buddy/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question, history, tz }),
    cache: "no-store",
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || body.message || "I couldn't reach the server just now.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let answer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev: { type: string; state?: DropState; text?: string; message?: string };
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === "state" && ev.state) on.onState?.(ev.state);
      else if (ev.type === "text" && ev.text) { answer += ev.text; on.onText?.(ev.text); }
      else if (ev.type === "error") throw new Error(ev.message || "Something broke on my side.");
    }
  }
  return answer.trim();
}
