"use client";

/**
 * "Let Drop finish it" on a hand-back row: the extension refills that one employer form in
 * a window the person can see and stops at whatever needs them (a code from their inbox, a
 * captcha, a field we can't answer). The page only asks; the extension decides
 * (background startFinishRun) and answers HIREDROP_FINISH_STARTED through ping.js.
 *
 * Only Greenhouse, Lever and Ashby forms on their own hosts: those are the pages the
 * extension runs on. An Indeed or ZipRecruiter step can't be reopened from a link.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Handback } from "@/components/dashboard/useHandbacks";

const FINISH_PLATFORMS = ["greenhouse", "lever", "ashby"];
const FINISH_HOST = /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com)$/i;

export function finishable(h: Handback): boolean {
  if (!FINISH_PLATFORMS.includes((h.platform || "").toLowerCase())) return false;
  try {
    const u = new URL(h.url);
    return u.protocol === "https:" && FINISH_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

// The extension runs in desktop Chrome only: on a phone the button could only fail.
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile/i;
const noSubscribe = () => () => {};

/** filling = the window is open and Drop is on it; the rest say why it didn't start. */
export type FinishState =
  | "asking" | "filling"
  | "busy" | "daily_limit" | "free_limit" | "unsupported"
  | "old_extension" | "no_extension";

/** The refusals background startFinishRun answers with, by name. */
const EXTENSION_REFUSALS: FinishState[] = ["busy", "daily_limit", "free_limit", "unsupported"];

/** What a refused start tells the person. Fixed wording: never the extension's own text. */
export const FINISH_REFUSAL: Partial<Record<FinishState, string>> = {
  busy: "Drop is busy with your run. Try again when it ends.",
  daily_limit: "Today's applications are used up. Try again tomorrow.",
  free_limit: "Your free applications are used up. Subscribe to keep applying.",
  unsupported: "Drop can't reopen this form. Open it yourself instead.",
  old_extension: "This needs the newest HireDrop extension. Chrome updates it within a few hours; until then, open the form yourself.",
  no_extension: "The extension didn't answer. Reload this page and try again.",
};

/** The row's state for one HIREDROP_FINISH_STARTED answer. */
export function finishAnswerState(data: { ok?: unknown; error?: unknown }): FinishState {
  if (data.ok) return "filling";
  if (EXTENSION_REFUSALS.includes(data.error as FinishState)) return data.error as FinishState;
  // context_invalidated (the extension was reloaded under this tab), or a word we don't know.
  return "no_extension";
}

// The extension answers within a beat; silence means it isn't there or this tab lost it.
const ANSWER_WAIT_MS = 4000;
const PONG_WAIT_MS = 1000;
// The fill takes a minute or two; past that the row offers the button again, and the
// 30s hand-back poll has removed it already if the application went through.
const FILLING_SHOWN_MS = 4 * 60 * 1000;
// A refusal is read, then the button comes back for another try.
const REFUSAL_SHOWN_MS = 20 * 1000;

export function useFinishHandback() {
  // False on the server render and on phones; the row then offers the plain link only.
  const canFinish = useSyncExternalStore(noSubscribe, () => !MOBILE_UA.test(navigator.userAgent), () => false);
  const [state, setState] = useState<Record<string, FinishState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // The PING probe's listener per row, removed as soon as that row has an answer.
  const pongs = useRef<Record<string, (e: MessageEvent) => void>>({});

  const dropPong = useCallback((id: string) => {
    const l = pongs.current[id];
    if (l) window.removeEventListener("message", l);
    delete pongs.current[id];
  }, []);

  const set = useCallback((id: string, next: FinishState, clearAfterMs?: number) => {
    clearTimeout(timers.current[id]);
    dropPong(id);
    setState((prev) => ({ ...prev, [id]: next }));
    if (clearAfterMs) {
      timers.current[id] = setTimeout(() => {
        setState((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }, clearAfterMs);
    }
  }, [dropPong]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.type !== "HIREDROP_FINISH_STARTED") return;
      const id = String(e.data.id || "");
      if (!id) return;
      const next = finishAnswerState(e.data);
      set(id, next, next === "filling" ? FILLING_SHOWN_MS : REFUSAL_SHOWN_MS);
    };
    window.addEventListener("message", onMsg);
    const pending = timers.current;
    const probes = pongs.current;
    return () => {
      window.removeEventListener("message", onMsg);
      for (const t of Object.values(pending)) clearTimeout(t);
      for (const l of Object.values(probes)) window.removeEventListener("message", l);
    };
  }, [set]);

  const finish = useCallback((h: Handback) => {
    set(h.id, "asking");
    // No answer: either an extension from before this button (the store lags the code,
    // and its ping.js ignores the message but still answers PING) or none reachable from
    // this tab (not installed, or reloaded under it). One PING tells them apart.
    timers.current[h.id] = setTimeout(() => {
      let pong = false;
      const onPong = (e: MessageEvent) => { if (e.source === window && e.data === "HIREDROP_PONG") pong = true; };
      pongs.current[h.id] = onPong;
      window.addEventListener("message", onPong);
      window.postMessage("HIREDROP_PING", "*");
      timers.current[h.id] = setTimeout(() => {
        set(h.id, pong ? "old_extension" : "no_extension", REFUSAL_SHOWN_MS);
      }, PONG_WAIT_MS);
    }, ANSWER_WAIT_MS);
    window.postMessage({
      type: "HIREDROP_FINISH_HANDBACK",
      handback: {
        id: h.id, url: h.url, platform: h.platform, job_title: h.job_title,
        company: h.company, job_id: h.job_id ?? null,
      },
    }, "*");
  }, [set]);

  return { finishState: state, finish, canFinish };
}
