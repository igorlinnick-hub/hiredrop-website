"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";

type Handback = { id: string; job_title: string; company: string; url: string };

/**
 * Rail item for the applications waiting on the user's hands.
 *
 * The filler hands a job back when a form step refuses it; the walk moves on at once,
 * so the job is WAITING, not lost. Until 09-21 the only places that said so were the
 * activity feed and History — both of which scroll away, which put the one thing in the
 * product that actually needs a human in the hardest place to find (Igor: "это нужно не
 * в history а в попапе... чтоб была анимация заявки что нужно человеку доделать").
 *
 * This is the dashboard half; the extension popup shows the same list from the same
 * endpoint, so the two counts cannot disagree.
 *
 * Renders NOTHING at zero. A permanent "0 waiting" row is furniture: it trains the eye
 * to skip the spot, and then the badge that matters arrives somewhere already ignored.
 */
export default function HandbackRailItem({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Handback[]>([]);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      const res = await apiGet<{ handbacks: Handback[] }>("/handbacks?limit=20", t);
      setItems(res.handbacks || []);
    } catch {
      // An unreachable list is not an empty one — keep whatever we last knew rather
      // than blinking the badge out of existence on one failed poll.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // A hand-back appears mid-run, so the badge has to arrive without a reload. 30s is
    // slow enough to be free and fast enough that the user sees it while still watching.
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  if (!items.length) return null;

  const n = items.length;
  return (
    <Link
      href="/dashboard/history#handbacks"
      className={`group flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium
        border border-amber-400/40 bg-amber-400/10 text-text
        hover:bg-amber-400/20 transition ${compact ? "" : "mt-3"}`}
      title={items.map((h) => h.job_title).join(", ")}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {/* The pulse is the message: something is waiting on YOU. */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      <span className="flex-1 leading-tight">
        Needs your hands
        <span className="block text-[11px] font-normal text-text2">
          {n === 1 ? "1 application" : `${n} applications`} to finish
        </span>
      </span>
      <span
        className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white
          tabular-nums"
      >
        {n}
      </span>
    </Link>
  );
}
