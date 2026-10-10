// Which search phrases the dashboard names as dry, and which resume roles it offers in
// their place (GET /jobs/keyword-yield, GET /tools/suggest-roles).

export type Tally = { keyword: string; pages: number; judged: number; fits: number; dry: boolean };
export type YieldResponse = { keywords: Tally[]; window_days: number; all_dry: boolean };

export const MAX_REPLACEMENTS = 2;

const norm = (s: string) => s.trim().toLowerCase();

// Only phrases still in the list: the tally can trail an edit the person just made.
export function dryHints(data: YieldResponse, keywords: string[], isKept: (k: string) => boolean): Tally[] {
  const have = new Set(keywords.map(norm));
  return data.keywords.filter((k) => k.dry && have.has(norm(k.keyword)) && !isKept(k.keyword));
}

// A role already searched for is no replacement.
export function replacementRoles(roles: string[], keywords: string[]): string[] {
  const have = new Set(keywords.map(norm));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of roles) {
    const key = norm(r);
    if (!key || have.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(r.trim());
    if (out.length === MAX_REPLACEMENTS) break;
  }
  return out;
}
