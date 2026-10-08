import { apiPost } from "@/lib/api";
import { HINTS_PREFIX, hintCacheKey, parseHints, type ResumeHints } from "@/lib/employerAnswers";
import { createClient } from "@/lib/supabase/client";

// What the user's own resume says for the employer questions still blank
// (POST /profile/employer-answers/suggest). The read can cost a model call and a slot of
// the day's AI budget, so it happens once per resume per sitting: reopening the form —
// Back and forward in signup, or the Start sheet a second time — reuses what it found,
// and a read already under way (the prefetch right after an upload) is joined, not
// repeated. Best-effort by design: any failure is "no hints", never an error on screen.
const NONE: ResumeHints = { suggestions: {}, fromResume: null };
const inFlight = new Map<string, Promise<ResumeHints>>();

export async function resumeHints(token: string, userId: string, resume: string | null): Promise<ResumeHints> {
  const cacheKey = hintCacheKey(userId, resume);
  try {
    const cached = parseHints(JSON.parse(window.sessionStorage.getItem(cacheKey) || "null"));
    if (cached) return cached;
  } catch { /* unreadable cache = no cache */ }
  const running = inFlight.get(cacheKey);
  if (running) return running;
  const read = (async () => {
    const res = await apiPost<unknown>("/profile/employer-answers/suggest", token, {}).catch(() => null);
    const found = parseHints(res);
    if (!found) return NONE;
    try {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(res));
    } catch { /* private mode — we simply ask again next time */ }
    return found;
  })().finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, read);
  return read;
}

/** The form's way in: whoever is signed in, and whichever resume their profile names now. */
export async function currentResumeHints(): Promise<ResumeHints> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.access_token) return NONE;
    const { data: prof } = await supabase
      .from("profiles")
      .select("resume_url")
      .eq("user_id", session.user.id)
      .maybeSingle();
    return await resumeHints(session.access_token, session.user.id, prof?.resume_url || null);
  } catch {
    return NONE; // no session, no hints — the boxes stay empty
  }
}

/** Right after an upload: start reading the new resume so its facts are ready by the
 *  time the questions open. Fire-and-forget — the form reads (or joins) it itself. */
export function prefetchResumeHints(token: string, userId: string, resume: string): void {
  void resumeHints(token, userId, resume).catch(() => {});
}

/** A new resume makes what the old one said worthless. Called wherever one is uploaded. */
export function forgetResumeHints(): void {
  try {
    const store = window.sessionStorage;
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i);
      if (key && key.startsWith(HINTS_PREFIX)) store.removeItem(key);
    }
  } catch { /* nothing cached, nothing to forget */ }
}
