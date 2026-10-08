/**
 * History's place filter — "where was this job", grouped the way a person thinks
 * about a search (Igor 10-08: «блок с remote, блок с городом, блок гибрид с городом»).
 *
 * The backend reduces each row's free-text location to two facts (GET
 * /applications/history): `work_setting` (remote | hybrid | onsite | null, from
 * the posting's own words) and `place` ("Houston, TX", or null when the text names
 * no US city). This file only groups them; it never parses a location itself, so
 * the deck filter and this page can't disagree about what "remote" means.
 *
 * The chips are built from the record, not from a fixed list: whatever cities the
 * user's searches actually reached become chips, biggest first. A row we never got
 * a location for is counted as such ("No location") — older applications predate
 * the extension sending one (ext 1.8.43, 10-06), and a guessed city would be worse.
 */

type PlaceFacts = {
  location?: string | null;
  work_setting?: string | null;
  place?: string | null;
};

export type PlaceChip = { key: string; label: string; n: number; title?: string };

/** Above this many cities the rest fold into "Other places" — a chip row that wraps
 *  three times on a phone stops being a filter and becomes a second list. */
export const MAX_PLACE_CHIPS = 4;

const NONE = "none";
const OTHER = "other";

/** The finest group a row belongs to, before any folding. */
export function placeKeyOf(a: PlaceFacts): string {
  if (a.work_setting === "remote") return "remote";
  if (a.place) return a.work_setting === "hybrid" ? `hybrid:${a.place}` : `place:${a.place}`;
  if (a.work_setting === "hybrid") return "hybrid";
  if ((a.location || "").trim()) return OTHER; // a location we couldn't place ("Austin", "United States")
  return NONE;
}

const placeOf = (key: string) =>
  key.startsWith("place:") ? key.slice(6) : key.startsWith("hybrid:") ? key.slice(7) : null;

const cityOf = (place: string) => place.split(",")[0].trim();

/**
 * The chip row, in reading order: All · Remote · each city (its hybrid chip right
 * after it) · Hybrid · Other places · No location. Only groups with rows get a chip,
 * and the row as a whole is empty when there is nothing to choose between.
 */
export function buildPlaceChips(rows: PlaceFacts[]): { chips: PlaceChip[]; chipOf: (a: PlaceFacts) => string } {
  const counts = new Map<string, number>();
  for (const a of rows) {
    const k = placeKeyOf(a);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  // Cities ranked by everything sent there, on-site and hybrid together.
  const perPlace = new Map<string, number>();
  for (const [k, n] of counts) {
    const p = placeOf(k);
    if (p) perPlace.set(p, (perPlace.get(p) ?? 0) + n);
  }
  const ranked = Array.from(perPlace.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = new Set(ranked.slice(0, MAX_PLACE_CHIPS).map(([p]) => p));

  const chipOf = (a: PlaceFacts) => {
    const k = placeKeyOf(a);
    const p = placeOf(k);
    return p && !shown.has(p) ? OTHER : k;
  };

  // "Houston" reads better than "Houston, TX" — unless two shown cities share a name.
  const cityNames = Array.from(shown).map(cityOf);
  const label = (p: string) => (cityNames.filter((c) => c === cityOf(p)).length > 1 ? p : cityOf(p));

  const chips: PlaceChip[] = [];
  const push = (key: string, text: string, n: number, title?: string) => {
    if (n > 0) chips.push({ key, label: text, n, title });
  };
  push("remote", "Remote", counts.get("remote") ?? 0);
  for (const [p] of ranked.slice(0, MAX_PLACE_CHIPS)) {
    push(`place:${p}`, label(p), counts.get(`place:${p}`) ?? 0, p);
    push(`hybrid:${p}`, `Hybrid · ${label(p)}`, counts.get(`hybrid:${p}`) ?? 0, `Hybrid — ${p}`);
  }
  push("hybrid", "Hybrid", counts.get("hybrid") ?? 0, "Hybrid, city not named");
  const folded = ranked.slice(MAX_PLACE_CHIPS).reduce((s, [, n]) => s + n, 0);
  push(OTHER, "Other places", (counts.get(OTHER) ?? 0) + folded);
  push(NONE, "No location", counts.get(NONE) ?? 0, "Sent before we saved where the job is");

  // One group only = nothing to filter between.
  if (chips.length < 2) return { chips: [], chipOf };
  return { chips: [{ key: "all", label: "All", n: rows.length }, ...chips], chipOf };
}

/** What the row says about where the job is, for its meta line. Empty when unknown. */
export function placeText(a: PlaceFacts): string {
  const k = placeKeyOf(a);
  if (k === "remote") return "Remote";
  if (k === "hybrid") return "Hybrid";
  if (k === OTHER) {
    const raw = (a.location || "").trim();
    return raw.length > 32 ? `${raw.slice(0, 31)}…` : raw;
  }
  if (k === NONE) return "";
  const p = placeOf(k) as string;
  return k.startsWith("hybrid:") ? `Hybrid · ${p}` : p;
}
