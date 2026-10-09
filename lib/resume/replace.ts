import type { SupabaseClient } from "@supabase/supabase-js";
import { forgetResumeHints, prefetchResumeHints } from "@/lib/employerAnswersHints";
import { resumeProfile, uploadOriginalResume } from "@/lib/resume/upload";

/** The ATS check measured the previous file, so a new upload clears its result. */
export const ATS_RESET = { ats_approved: false, ats_score: null, ats_issues: [], ats_checked_at: null };

/**
 * A signed-in person replaces their resume from the dashboard (Settings or Drop's chat).
 * Returns the new storage path, or null when nothing changed. What the previous resume
 * said is no hint about this one, so cached hints are dropped and the new file is read
 * right away, so the Start sheet's questions open already filled in.
 */
export async function replaceResume(
  supabase: SupabaseClient,
  userId: string,
  token: string | null,
  file: Blob,
): Promise<string | null> {
  const path = await uploadOriginalResume(
    supabase.storage.from("resumes"),
    resumeProfile(supabase, userId, ATS_RESET),
    userId,
    file,
  );
  if (!path) return null;
  forgetResumeHints();
  if (token) prefetchResumeHints(token, userId, path);
  return path;
}
