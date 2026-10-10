// Which search phrases the dashboard names as dry, and which resume role it offers in
// each one's place (GET /jobs/keyword-yield, GET /tools/suggest-roles).

export type Tally = { keyword: string; pages: number; judged: number; fits: number; dry: boolean };
export type YieldResponse = { keywords: Tally[]; window_days: number; all_dry: boolean };

// keyword: the person's own spelling, so a swap replaces exactly the phrase in their list.
// replacement: the best resume role not searched yet, or null when none is left.
export type SwapRow = { keyword: string; replacement: string | null };

// Same key as the server's keyword_key(): trimmed, inner spaces collapsed, lowercased.
const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// A role reads in the case of the phrase it replaces (the server sends roles lower-cased):
// "Project Manager → digital marketing manager" would read as a glitch, and the swap puts
// into the list exactly what the chip showed.
function inCaseOf(phrase: string, role: string): string {
  if (phrase === phrase.toLowerCase()) return role.toLowerCase();
  return role.replace(/(^|\s)(\p{Ll})/gu, (_, sp: string, c: string) => sp + c.toUpperCase());
}

// Only phrases still in the list (the tally can trail an edit the person just made), one
// role per phrase, best first, never a role already searched and never the same role twice.
export function swapRows(
  data: YieldResponse,
  keywords: string[],
  roles: string[],
  isKept: (k: string) => boolean,
): SwapRow[] {
  const mine = new Map(keywords.map((k) => [norm(k), k]));
  const taken = new Set(mine.keys());
  const free = roles.map((r) => r.trim()).filter((r) => {
    const key = norm(r);
    if (!key || taken.has(key)) return false;
    taken.add(key);
    return true;
  });
  const rows: SwapRow[] = [];
  for (const t of data.keywords) {
    const own = mine.get(norm(t.keyword));
    if (!t.dry || own === undefined || isKept(own)) continue;
    const role = free.shift();
    rows.push({ keyword: own, replacement: role === undefined ? null : inCaseOf(own, role) });
  }
  return rows;
}
