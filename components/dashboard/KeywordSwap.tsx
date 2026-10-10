"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { swapRows, type YieldResponse } from "@/lib/keyword-yield";

// A search phrase that keeps bringing nothing that fits (GET /jobs/keyword-yield: two or
// more judged pages, 20+ verdicts, zero fits in a week) gets a pulsing "→ role" chip right
// after it in the search bar, the role the best one off the resume. No words around it:
// the pulse says "look here", the arrow says "instead". Advice only: nothing changes
// unless the person taps the role, and its × keeps the phrase and hides the chip for
// KEEP_DAYS on this browser.

const KEEP_DAYS = 30;
const KEEP_PREFIX = "hd.kwYieldKeep.";

function keptRecently(keyword: string): boolean {
  try {
    const at = Number(localStorage.getItem(KEEP_PREFIX + keyword.toLowerCase()) || 0);
    return Date.now() - at < KEEP_DAYS * 86_400_000;
  } catch {
    return false; /* storage blocked: the chip simply shows again */
  }
}

function rememberKeep(keyword: string) {
  try {
    localStorage.setItem(KEEP_PREFIX + keyword.toLowerCase(), String(Date.now()));
  } catch {
    /* storage blocked: the chip is hidden for this visit only */
  }
}

// The tally is read from the saved profile, so a list just edited is asked about again
// once its save has had time to land, not on every keystroke.
const YIELD_REFRESH_MS = 1500;

// keyword (as the person typed it) → the role offered in its place.
export function useKeywordSwaps(keywords: string[], getToken: () => Promise<string>) {
  const [data, setData] = useState<YieldResponse | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const asked = useRef(false);
  const kwKey = keywords.map((k) => k.trim().toLowerCase()).join("\u001f");
  const hasDry = !!data?.keywords.some((k) => k.dry);

  // Reads the latest token getter without making it a reason to ask again.
  const loadYield = useEffectEvent(async (isCancelled: () => boolean) => {
    try {
      const res = await apiGet<YieldResponse>("/jobs/keyword-yield", await getToken());
      if (!isCancelled()) setData(res);
    } catch (e) {
      // The swap is advice on top of a working campaign: the last answer (or none) stays,
      // and the search bar works exactly as without it.
      console.warn("[keyword-yield] tally unavailable", e);
    }
  });

  // Roles are a model call capped per day on the server: asked once per visit, and only
  // when some phrase is dry, so edits and reloads of the tally never spend it again.
  const loadRoles = useEffectEvent(async (isCancelled: () => boolean) => {
    try {
      const r = await apiGet<{ roles: string[] }>("/tools/suggest-roles", await getToken());
      if (!isCancelled()) setRoles(r.roles || []);
    } catch (e) {
      console.warn("[keyword-yield] roles unavailable", e); /* no roles: no chip, nothing else changes */
    }
  });

  useEffect(() => {
    if (!kwKey) return;
    let cancelled = false;
    const id = setTimeout(() => loadYield(() => cancelled), asked.current ? YIELD_REFRESH_MS : 0);
    asked.current = true;
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [kwKey]);

  useEffect(() => {
    if (!hasDry) return;
    let cancelled = false;
    loadRoles(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [hasDry]);

  const swaps = new Map<string, string>();
  if (data && kwKey) {
    for (const r of swapRows(data, keywords, roles, (k) => kept.includes(k) || keptRecently(k))) {
      if (r.replacement) swaps.set(r.keyword, r.replacement);
    }
  }
  const keep = (keyword: string) => {
    rememberKeep(keyword);
    setKept((s) => [...s, keyword]);
  };
  return { swaps, keep };
}

export function KeywordSwapChip({
  from,
  to,
  onSwap,
  onKeep,
}: {
  from: string;
  to: string;
  onSwap: () => void;
  onKeep: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" data-testid="keyword-swap">
      <svg className="w-3 h-3 text-text2/70" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
      <span className="hd-swap-chip inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-white text-xs font-semibold rounded-full">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSwap(); }}
          title={`Swap for "${to}"`}
          aria-label={`No fits for "${from}" this week. Swap it for "${to}"`}
        >
          {to}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onKeep(); }}
          className="opacity-60 hover:opacity-100 transition"
          title={`Keep "${from}"`}
          aria-label={`Keep "${from}"`}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <path d="M5 4.293 8.146 1.146a.5.5 0 0 1 .708.708L5.707 5l3.147 3.146a.5.5 0 0 1-.708.708L5 5.707 1.854 8.854a.5.5 0 0 1-.708-.708L4.293 5 1.146 1.854a.5.5 0 1 1 .708-.708z" />
          </svg>
        </button>
      </span>
    </span>
  );
}
