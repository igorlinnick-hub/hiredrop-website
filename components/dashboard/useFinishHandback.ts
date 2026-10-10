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

import { useCallback, useEffect, useRef, useState } from "react";
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

/** filling = the window is open and Drop is on it; the rest say why it didn't start. */
export type FinishState = "asking" | "filling" | "busy" | "daily_limit" | "no_extension";

/** What a refused start tells the person. Fixed wording: never the extension's own text. */
export const FINISH_REFUSAL: Partial<Record<FinishState, string>> = {
  busy: "Drop is busy with your run. Try again when it ends.",
  daily_limit: "Today's applications are used up. Try again tomorrow.",
  no_extension: "The extension didn't answer. Reload this page and try again.",
};

// The extension answers within a beat; silence means it isn't there or this tab lost it.
const ANSWER_WAIT_MS = 4000;
// The fill takes a minute or two; past that the row offers the button again, and the
// 30s hand-back poll has removed it already if the application went through.
const FILLING_SHOWN_MS = 4 * 60 * 1000;

export function useFinishHandback() {
  const [state, setState] = useState<Record<string, FinishState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const set = useCallback((id: string, next: FinishState, clearAfterMs?: number) => {
    clearTimeout(timers.current[id]);
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
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.type !== "HIREDROP_FINISH_STARTED") return;
      const id = String(e.data.id || "");
      if (!id) return;
      if (e.data.ok) set(id, "filling", FILLING_SHOWN_MS);
      else if (e.data.error === "busy" || e.data.error === "daily_limit") set(id, e.data.error);
      else set(id, "no_extension");
    };
    window.addEventListener("message", onMsg);
    const pending = timers.current;
    return () => {
      window.removeEventListener("message", onMsg);
      for (const t of Object.values(pending)) clearTimeout(t);
    };
  }, [set]);

  const finish = useCallback((h: Handback) => {
    set(h.id, "asking");
    // No answer at all: the extension isn't installed, or this tab predates its reload.
    timers.current[h.id] = setTimeout(() => {
      setState((prev) => (prev[h.id] === "asking" ? { ...prev, [h.id]: "no_extension" } : prev));
    }, ANSWER_WAIT_MS);
    window.postMessage({
      type: "HIREDROP_FINISH_HANDBACK",
      handback: {
        id: h.id, url: h.url, platform: h.platform, job_title: h.job_title,
        company: h.company, job_id: h.job_id ?? null,
      },
    }, "*");
  }, [set]);

  return { finishState: state, finish };
}
