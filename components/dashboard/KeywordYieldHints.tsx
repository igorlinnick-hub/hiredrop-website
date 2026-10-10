"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { apiGet } from "@/lib/api";
import { swapRows, type YieldResponse } from "@/lib/keyword-yield";

// A search phrase that keeps bringing nothing that fits (GET /jobs/keyword-yield: two or
// more judged pages, 20+ verdicts, zero fits in a week) is shown as "old → new", the new
// one the best role off the resume. No tallies or counts: one glance should say what to
// swap. Advice only: nothing changes unless the person taps Swap, and Keep hides that row
// for KEEP_DAYS on this browser.

const KEEP_DAYS = 30;
const KEEP_PREFIX = "hd.kwYieldKeep.";

function keptRecently(keyword: string): boolean {
  try {
    const at = Number(localStorage.getItem(KEEP_PREFIX + keyword.toLowerCase()) || 0);
    return Date.now() - at < KEEP_DAYS * 86_400_000;
  } catch {
    return false; /* storage blocked: the hint simply shows again */
  }
}

function rememberKeep(keyword: string) {
  try {
    localStorage.setItem(KEEP_PREFIX + keyword.toLowerCase(), String(Date.now()));
  } catch {
    /* storage blocked: the hint is hidden for this visit only */
  }
}

export default function KeywordYieldHints({
  keywords,
  getToken,
  onReplace,
}: {
  keywords: string[];
  getToken: () => Promise<string>;
  onReplace: (original: string, replacement: string) => void;
}) {
  const [data, setData] = useState<YieldResponse | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const kwKey = keywords.map((k) => k.trim().toLowerCase()).join("\u001f");

  // Reads the latest token getter and the roles already fetched without making either a
  // reason to ask again: only a new phrase list is.
  const load = useEffectEvent(async (isCancelled: () => boolean) => {
    try {
      const t = await getToken();
      const res = await apiGet<YieldResponse>("/jobs/keyword-yield", t);
      if (isCancelled()) return;
      setData(res);
      if (res.keywords.some((k) => k.dry) && roles.length === 0) {
        const r = await apiGet<{ roles: string[] }>("/tools/suggest-roles", t);
        if (!isCancelled()) setRoles(r.roles || []);
      }
    } catch (e) {
      // The hint is advice on top of a working campaign: without it the dashboard is
      // exactly what it was, so a failed read is logged and the hint stays hidden.
      console.warn("[keyword-yield] hint unavailable", e);
      if (!isCancelled()) setData(null);
    }
  });

  useEffect(() => {
    let cancelled = false;
    if (kwKey) load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [kwKey]);

  if (!data || !kwKey) return null;
  const rows = swapRows(data, keywords, roles, (k) => kept.includes(k) || keptRecently(k));
  if (!rows.length) return null;
  // One phrase: the reason sits right under it, buttons to the side (on a phone they drop
  // below both). Several: one reason under the whole list.
  const reason = (
    <p className="mt-1 text-xs text-text2">
      {data.all_dry ? "None of your keywords found a fit this week." : "No fits this week."} Next round could find more.
    </p>
  );

  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3" data-testid="keyword-yield-hints">
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.keyword}
            data-testid="keyword-yield-hint"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5"
          >
            <div className="min-w-0">
              <p className="text-sm">
                <span className="text-text2">{r.keyword}</span>
                {r.replacement && (
                  <>
                    <svg
                      className="mx-1.5 inline-block w-3.5 h-3.5 -mt-0.5 text-text2/70"
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                    </svg>
                    <span className="sr-only">, try </span>
                    <span className="font-semibold text-text">{r.replacement}</span>
                  </>
                )}
              </p>
              {rows.length === 1 && reason}
            </div>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {r.replacement && (
                <button
                  type="button"
                  onClick={() => onReplace(r.keyword, r.replacement!)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-accent text-white hover:bg-accent2 transition"
                  aria-label={`Swap "${r.keyword}" for "${r.replacement}"`}
                >
                  Swap
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  rememberKeep(r.keyword);
                  setKept((s) => [...s, r.keyword]);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-lg text-text2 hover:text-text hover:bg-surface2 transition"
                aria-label={`Keep "${r.keyword}"`}
              >
                Keep
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length > 1 && reason}
    </div>
  );
}
