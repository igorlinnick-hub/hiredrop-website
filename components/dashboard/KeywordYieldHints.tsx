"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { apiGet } from "@/lib/api";
import { dryHints, replacementRoles, type YieldResponse } from "@/lib/keyword-yield";

// A search phrase that keeps bringing nothing that fits (GET /jobs/keyword-yield: two or
// more judged pages, 20+ verdicts, zero fits in a week) is named here with one-tap
// replacements read off the resume. Advice only: nothing is removed unless the person
// taps a replacement, and "keep" hides the hint for KEEP_DAYS on this browser.

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
  const dry = dryHints(data, keywords, (k) => kept.includes(k) || keptRecently(k));
  if (!dry.length) return null;
  const replacements = replacementRoles(roles, keywords);

  return (
    <div className="flex flex-col gap-1.5 px-1" data-testid="keyword-yield-hints">
      {data.all_dry && (
        <p className="text-xs text-text2">
          None of your keywords found a fit this week. Swap one for a role from your resume:
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {dry.map((k) => (
          <span
            key={k.keyword}
            data-testid="keyword-yield-hint"
            className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-yellow/30 bg-yellow/[0.07]
              px-2.5 py-1 text-xs text-text2"
          >
            <span>
              <span className="font-semibold text-text">&ldquo;{k.keyword}&rdquo;</span>
              <span className="text-text2/70">
                : 0 of {k.judged} fit in {data.window_days} days
              </span>
            </span>
            {replacements.length > 0 && <span className="text-text2/70">· Try</span>}
            {replacements.map((r) => (
              <button
                key={r}
                onClick={() => onReplace(k.keyword, r)}
                className="font-semibold text-accent hover:underline"
                title={`Replace "${k.keyword}" with "${r}"`}
              >
                {r}
              </button>
            ))}
            <button
              onClick={() => {
                rememberKeep(k.keyword);
                setKept((s) => [...s, k.keyword]);
              }}
              className="ml-0.5 text-text2/40 hover:text-text2 transition"
              title="Keep this keyword"
              aria-label={`Keep "${k.keyword}"`}
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                <path d="M5 4.293 8.146 1.146a.5.5 0 0 1 .708.708L5.707 5l3.147 3.146a.5.5 0 0 1-.708.708L5 5.707 1.854 8.854a.5.5 0 0 1-.708-.708L4.293 5 1.146 1.854a.5.5 0 1 1 .708-.708z" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
