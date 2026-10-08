"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";

/** A required field the filler could not answer, as the form showed it. */
export type HandbackQuestion = { label: string; options: string[] };

export type Handback = {
  id: string;
  job_title: string;
  company: string;
  url: string;
  reason: string;
  steps_done: number;
  /** What the form asked and we left blank. Empty for rows written before 09-21, and
   *  for walls that weren't about a question (no submit button, resume upload failed). */
  questions?: HandbackQuestion[];
  /** Answers the user already gave, question-keyed. */
  answers?: Record<string, string>;
  /** The pool row, when there is one. Without it the answers are stored but the job
   *  can't be re-queued — a native Indeed/ZR hand-back was never a pool row. */
  job_id?: string | null;
  /** Set once the answers went in and the job went back to `approved`. */
  requeued_at?: string | null;
  /** The extension updated since this form stopped, and the queue can take it back:
   *  offer "Try again". Never retried by itself — the person may have finished it by
   *  hand (Igor, 10-02). */
  newer_build?: boolean;
};

/**
 * The applications waiting on the user's hands — one fetch, shared by the nav dot and
 * the History list so they can never disagree about what is still open.
 *
 * Deliberately quiet: this returns data, never a banner. Igor, 09-21: "это должно быть
 * seamless для юзера чтоб он не видел кучу текста и каких то разных уведомлений каждый
 * раз". A dot that means something beats a paragraph that gets skipped.
 */
export function useHandbacks(pollMs = 30000) {
  const [items, setItems] = useState<Handback[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await createClient().auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      const res = await apiGet<{ handbacks: Handback[] }>("/handbacks?limit=20", t);
      setItems(res.handbacks || []);
    } catch {
      // An unreachable list is not an empty one — keep the last known state instead of
      // blinking the dot out of existence on a single failed poll.
    }
  }, []);

  useEffect(() => {
    // setState happens after an await, not synchronously — the rule can't see through
    // the async call, and deferring the first fetch would just delay the dot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // A hand-back appears mid-run, so the dot has to arrive without a reload.
    const iv = setInterval(load, pollMs);
    return () => clearInterval(iv);
  }, [load, pollMs]);

  return { items, reload: load, setItems };
}

/**
 * Progress as a fraction of screens, not a vibe.
 *
 * We know exactly how many form screens were completed (`steps_done`) and that at least
 * one remains — the one that refused us. So the honest denominator is steps_done + 1:
 * "five done, one to go". We do NOT know whether that last screen hides two more, and
 * the copy never implies otherwise. Zero steps = nothing observed = show no bar at all
 * rather than draw an empty one and call it progress.
 */
export function handbackProgress(stepsDone: number): number | null {
  const done = Math.max(0, Math.floor(stepsDone || 0));
  if (done <= 0) return null;
  return Math.round((done / (done + 1)) * 100);
}

/**
 * The ✕ on the History list (Igor, 10-08: «крестик чтоб убрать если что»).
 *
 * Hiding is not resolving: the rows stay open on the server, and "Done" is still the only
 * way to say a job is finished. The ✕ remembers WHAT was on screen when it was pressed,
 * so the list — and the nav dot, which reads the same flag — come back on their own the
 * moment something new needs the person. "Hide these", never "hide hand-backs forever":
 * a job that needs a human must not go silent because an older batch was dismissed.
 *
 * "What", not just which ids: a repeat wall on the same posting OVERWRITES the open row
 * (jobflow app/db/handbacks.py `_update_open` — same id, requeued_at back to null, new
 * reason and questions). A row the person re-queued and then hid, which hits the wall
 * again, keeps its id — keyed by id alone it would stay hidden exactly when it needs them.
 *
 * This browser only (localStorage), with an in-memory fallback so the ✕ still works for
 * the visit when storage refuses the write. The snapshot is the raw string — a primitive —
 * so useSyncExternalStore sees one value until it actually changes.
 */
const HIDDEN_KEY = "hd:handbacks:hidden";

/** Everything about a row that changes when it needs the person again. Queued-or-not is a
 *  flag, not the timestamp: queued → open again is news, re-queued twice is not. */
const handbackKey = (h: Handback) =>
  [
    h.id,
    h.requeued_at ? "queued" : "open",
    h.reason,
    h.steps_done,
    h.job_title,
    h.company,
    (h.questions || []).map((q) => q.label).join("\u241f"),
  ].join("|");

const hiddenListeners = new Set<() => void>();
let hiddenInMemory = "";

// The in-memory copy is set only while storage refuses writes, so a working storage
// (and another tab's ✕ arriving through it) is always what gets read.
const readHidden = () => {
  if (hiddenInMemory) return hiddenInMemory;
  try {
    return localStorage.getItem(HIDDEN_KEY) ?? "";
  } catch {
    return "";
  }
};

const subscribeHidden = (listener: () => void) => {
  hiddenListeners.add(listener);
  // The ✕ pressed in another tab hides the list here too.
  // key === null is another tab's localStorage.clear().
  const onStorage = (e: StorageEvent) => { if (e.key === HIDDEN_KEY || e.key === null) listener(); };
  window.addEventListener("storage", onStorage);
  return () => {
    hiddenListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

export function useHiddenHandbacks(items: Handback[]) {
  const raw = useSyncExternalStore(subscribeHidden, readHidden, () => "");
  const hidden = useMemo(() => {
    try {
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);

  const allHidden = items.length > 0 && items.every((h) => hidden.has(handbackKey(h)));

  // Replaces the stored set rather than adding to it: only what is on screen now is
  // remembered, so the key never outgrows one page of /handbacks.
  const hide = useCallback(() => {
    const next = JSON.stringify(items.map(handbackKey));
    try {
      localStorage.setItem(HIDDEN_KEY, next);
      hiddenInMemory = "";
    } catch {
      hiddenInMemory = next; // Private mode / full storage — hidden for this visit only.
    }
    hiddenListeners.forEach((l) => l());
  }, [items]);

  return { allHidden, hide };
}
