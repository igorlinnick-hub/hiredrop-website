import { apiPost } from "@/lib/api";

// What the user's own resume says for the employer questions still blank
// (POST /profile/employer-answers/suggest). The read can cost a model call and a slot of
// the day's AI budget, so it happens once per sitting: reopening the form — Back and
// forward in signup, or the Start sheet a second time — reuses what it found.
// Best-effort by design: any failure is "no hints", never an error on screen.
export async function resumeHints(token: string, userId: string): Promise<Record<string, string>> {
  const cacheKey = `hd_answer_hints:${userId}`;
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null");
    if (cached && typeof cached === "object") return cached;
  } catch { /* unreadable cache = no cache */ }
  const res = await apiPost<{ suggestions: Record<string, string> }>(
    "/profile/employer-answers/suggest",
    token,
    {},
  ).catch(() => null);
  const found = res?.suggestions;
  if (!found) return {};
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(found));
  } catch { /* private mode — we simply ask again next time */ }
  return found;
}

/** A new resume makes what the old one said worthless. Called wherever one is uploaded. */
export function forgetResumeHints(): void {
  try {
    const store = window.sessionStorage;
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i);
      if (key && key.startsWith("hd_answer_hints:")) store.removeItem(key);
    }
  } catch { /* nothing cached, nothing to forget */ }
}
