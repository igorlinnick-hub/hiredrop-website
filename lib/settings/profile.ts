import type { UserProfile } from "@/lib/types";

/** A `profiles` row (or no row) as the Settings form shows it. Shared by the server
    page's first paint and SettingsView's background re-read, so both agree. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function profileFromRow(data: Record<string, any> | null, email: string | undefined): UserProfile {
  return {
    name: data?.name || "",
    last_name: data?.last_name || "",
    email: data ? email || "" : "",
    phone: data?.phone || "",
    keywords: data?.keywords || [],
    location: data?.location || "remote",
    // `?? ""` and NOT `|| "full-time"`: an empty/NULL job_type means "any type"
    // and must survive a page load. The old fallback made the picker claim
    // Full-time over a profile that had no type set at all — and a Save from that
    // screen then wrote the narrowing to the database, silently shrinking the
    // user's search to a filter they never chose.
    job_type: data?.job_type ?? "",
    platforms: data?.platforms || ["indeed"],
    writing_style: data?.writing_style || "",
    linkedin_url: data?.linkedin_url || "",
    portfolio_url: data?.portfolio_url || "",
    street_address: data?.street_address || "",
    city: data?.city || "",
    state: data?.state || "",
    postal_code: data?.postal_code || "",
    current_employer: data?.current_employer || "",
    current_title: data?.current_title || "",
    school: data?.school || "",
    degree: data?.degree || "",
    salary_expectation: data?.salary_expectation || "",
    work_authorized_us: data?.work_authorized_us ?? null,
    needs_sponsorship: data?.needs_sponsorship ?? null,
    notice_period: data?.notice_period || "",
    english_level: data?.english_level || "",
    resume_url: data?.resume_url || null,
    onboarding_completed: data?.onboarding_completed || false,
  };
}

/** The fields Settings may write. keywords / location / job_type / platforms /
    submit_mode belong to the DASHBOARD (QuickActions → /profile/prefs): saving them
    from here too is what let a stale Settings tab overwrite the filters of a
    running campaign. */
export const SETTINGS_FIELDS = [
  "name", "last_name", "phone", "linkedin_url", "portfolio_url",
  "street_address", "city", "state", "postal_code",
  "current_employer", "current_title", "school", "degree", "salary_expectation",
  "work_authorized_us", "needs_sponsorship", "notice_period", "english_level",
] as const satisfies readonly (keyof UserProfile)[];

export type SettingsField = (typeof SETTINGS_FIELDS)[number];

/** The update a Save sends: ONLY the fields the person edited on this screen.
    Sending the whole form wrote back whatever this page loaded — a Settings screen
    restored by Back, or a second tab left open, then overwrote answers given
    elsewhere in the meantime (employer questions on the dashboard). */
export function settingsPatch(
  profile: UserProfile,
  touched: ReadonlySet<string>,
  loaded: { school: string; salary_expectation: string },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of SETTINGS_FIELDS) if (touched.has(f)) patch[f] = profile[f];
  // Typing an answer here takes back an earlier "I don't have one" — but only
  // TYPING it: a value that was merely loaded and saved back untouched must not
  // quietly undo the person's opt-out.
  if (touched.has("school") && profile.school?.trim() && profile.school !== loaded.school) {
    patch.no_degree = false;
  }
  if (
    touched.has("salary_expectation") &&
    profile.salary_expectation?.trim() &&
    profile.salary_expectation !== loaded.salary_expectation
  ) {
    patch.no_salary_expectation = false;
  }
  return patch;
}
