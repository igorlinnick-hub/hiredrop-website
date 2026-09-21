"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";

export type Handback = {
  id: string;
  job_title: string;
  company: string;
  url: string;
  reason: string;
  steps_done: number;
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
