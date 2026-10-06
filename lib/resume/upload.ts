// Uploading the user's original resume: a fresh storage name every time.
//
// Until 10-06 every upload overwrote `<uid>/resume.pdf`. Storage serves objects with
// max-age=3600, so for seconds after a re-upload a freshly signed URL could still
// return the PREVIOUS file — the resume the user had just replaced went to an
// employer. A name nobody has fetched yet has nothing cached. profiles.resume_url
// names the current file; the backend reads it (jobflow app/db/resume.py, which
// applies the same naming and pruning rule to the ATS and skills files).

import type { SupabaseClient } from "@supabase/supabase-js";

type StorageItem = { name: string; updated_at?: string | null; created_at?: string | null };

// The narrow slice of the supabase-js storage bucket this needs.
export interface ResumeBucket {
  upload(
    path: string,
    file: Blob,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ error: unknown }>;
  list(
    folder: string,
    options?: { search?: string; limit?: number },
  ): Promise<{ data: StorageItem[] | null }>;
  remove(paths: string[]): Promise<unknown>;
}

// The profile side: read what profiles.resume_url names NOW (not what a possibly
// stale tab holds), and save the new path. `save` resolves false when the write failed.
export interface ResumeProfile {
  readCurrent(): Promise<string | null>;
  save(path: string): Promise<boolean>;
}

// profiles.resume_url as the backend reads it. `extra` columns are written in the same
// update (the dashboard resets the ATS check: it measured the previous file).
export function resumeProfile(
  supabase: SupabaseClient,
  userId: string,
  extra: Record<string, unknown> = {},
): ResumeProfile {
  return {
    async readCurrent() {
      const { data } = await supabase
        .from("profiles").select("resume_url").eq("user_id", userId).maybeSingle();
      return data?.resume_url || null;
    },
    async save(path) {
      const { error } = await supabase
        .from("profiles").update({ resume_url: path, ...extra }).eq("user_id", userId);
      return !error;
    },
  };
}

// An older upload is deleted only once it is at least this old: the extension signs a
// URL and fetches it within a second, so a file replaced minutes ago is no longer being
// read, and a younger one may belong to an upload in another tab.
export const STALE_AFTER_MS = 10 * 60 * 1000;

// `resume.pdf` (legacy) and `resume-<12 hex>.pdf`. A kept original filename from older
// onboarding (`Jane_Doe_Resume.pdf`) and the generated `resume_ats…` / `resume_skills…`
// files never match.
const ORIGINAL = /^resume(-[0-9a-f]{12})?\.pdf$/;

export function freshResumePath(userId: string): string {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${userId}/resume-${id}.pdf`;
}

function stamp(item: StorageItem): number {
  return Date.parse(item.updated_at || item.created_at || "");
}

// Older originals to delete once `fresh` is saved. `previous` — what the profile named
// before — is kept too, so a URL signed for it a moment ago still downloads; it goes at
// the NEXT upload. Age is measured against the fresh upload's own storage stamp, so a
// wrong device clock can't shrink the guard.
export function staleOriginals(
  userId: string,
  items: StorageItem[],
  fresh: string,
  previous: string | null,
): string[] {
  // A path outside the user's folder is nothing of theirs (the backend reads it as none),
  // and an empty one means the backend falls back to the legacy name.
  const prev = previous?.startsWith(`${userId}/`) ? previous : `${userId}/resume.pdf`;
  const keep = new Set([fresh, prev]);
  const now = stamp(items.find((item) => `${userId}/${item.name}` === fresh) || { name: "" });
  if (!Number.isFinite(now)) return []; // can't see the fresh upload's stamp — prune nothing
  return items
    .filter((item) => ORIGINAL.test(item.name) && !keep.has(`${userId}/${item.name}`))
    .filter((item) => {
      const at = stamp(item);
      return Number.isFinite(at) && now - at >= STALE_AFTER_MS;
    })
    .map((item) => `${userId}/${item.name}`);
}

// Upload `file` under a fresh name, point the profile at it, then prune older uploads.
// Returns the new path, or null when nothing changed for the user (a failed profile
// write removes the new file again, so the profile never names a file it lacks and no
// orphan is left behind). Pruning never fails the upload.
export async function uploadOriginalResume(
  bucket: ResumeBucket,
  profile: ResumeProfile,
  userId: string,
  file: Blob,
): Promise<string | null> {
  try {
    const previous = await profile.readCurrent();
    const path = freshResumePath(userId);
    const { error } = await bucket.upload(path, file, { contentType: "application/pdf" });
    if (error) return null;
    if (!(await profile.save(path))) {
      await bucket.remove([path]).catch(() => {});
      return null;
    }
    try {
      const { data } = await bucket.list(userId, { search: "resume", limit: 1000 });
      const stale = staleOriginals(userId, data || [], path, previous);
      if (stale.length) await bucket.remove(stale);
    } catch {
      // An orphan file costs storage, not correctness.
    }
    return path;
  } catch {
    return null;
  }
}
