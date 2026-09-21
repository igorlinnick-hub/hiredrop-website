import type { Platform, Location, JobType, JobStatus } from "./types";

// Login/signup URLs verified live 2026-07-10. Indeed, ZipRecruiter and Glassdoor
// use a UNIFIED auth page (enter email → logs in or creates an account), so their
// loginUrl doubles as the signup entry; deep "register" URLs 404. Only Wellfound
// has a distinct signup page (/join).
// `stage` = the honest automation stage shown to users (see Platform type):
// auto = extension applies end-to-end; semi = we fill the employer's ATS form,
// user finishes captcha + submit; connect = login detection only for now.
// Keep these truthful — the badge sets expectations, expectations = trust.
// Descriptions are ONE short line each. The row already carries the platform name and an
// "Auto-apply" badge, and the section header says what auto-apply means — so repeating
// "Extension auto-applies on your behalf" under every row was noise the eye has to skip
// (Igor, 09-07: "убрать лишний текст, упростить"). LinkedIn says "coming soon" because it
// is: stage "connect", not shipped, and the old copy read like a working feature.
export const PLATFORMS: Platform[] = [
  // Auto-apply via Chrome Extension (native 1-click apply modal — connect your account)
  { id: "indeed", name: "Indeed", status: "active", requiresLogin: true, autoApply: true, connectable: true, stage: "auto",
    loginUrl: "https://secure.indeed.com/auth",
    description: "Largest US job board." },
  { id: "ziprecruiter", name: "ZipRecruiter", status: "active", requiresLogin: true, autoApply: true, connectable: true, stage: "auto",
    loginUrl: "https://www.ziprecruiter.com/authn/login?realm=candidates",
    description: "Quick Apply roles." },
  // LinkedIn — Easy Apply only (the 1-click subset; NOT full-LinkedIn nav, which is anti-bot
  // heavy). Type A log-in. stage "connect" = coming soon until the Easy Apply handler ships +
  // passes a careful live test (PLATFORMS_MASTER_PLAN.md Phase 2); flip to "auto" then.
  { id: "linkedin", name: "LinkedIn", status: "active", requiresLogin: true, connectable: true, stage: "connect",
    loginUrl: "https://www.linkedin.com/login",
    description: "Easy Apply roles — coming soon." },
  // Greenhouse — company ATS (not a board you log into). The campaign walks saved
  // apply URLs from the job pool and fills+submits directly; it's near-captcha-free
  // (Enterprise invisible reCAPTCHA) so it runs full-auto with no account to connect.
  // No loginUrl / not connectable on purpose. Marked beta until live-validated.
  { id: "greenhouse", name: "Greenhouse", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Company career sites. No account needed." },
  // Lever + Ashby — same model as Greenhouse: guest-apply company ATS, no account to
  // connect. The campaign/tap deck walks their saved apply URLs and fills+submits directly.
  // (Lever's per-company hCaptcha = the one human step; Ashby is invisible-reCAPTCHA zero-touch.)
  { id: "lever", name: "Lever", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Company career sites. You clear one captcha." },
  { id: "ashby", name: "Ashby", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Company career sites. No account needed." },
  // REMOVED 2026-08-01 (PLATFORMS_MASTER_PLAN.md §1 "УБИРАЕМ"): Glassdoor (redundant with
  // Indeed, scrape dead), Monster + CareerBuilder (legacy/dying), Dice (tech-only niche),
  // Wellfound (startup niche, scraper dead/SPA → parking lot). Their apply routes through ATS
  // we already handle; keeping them as dead "coming soon" rows just misled users.
  // Public — no account needed to browse/apply.
  // Google Jobs — PAUSED 2026-09-03, and it was never an apply target: Google for Jobs is a
  // shop window inside Search, every card links out to the source (LinkedIn/Indeed/GH/Lever/
  // Workday/company site). On top of that Google now answers job searches only to a real
  // browser (server gets an "enablejs" interstitial), so our backend fetches literally zero.
  // It stayed listed as "active" for months and quietly returned nothing — the same silent-zero
  // failure as the jobspy package mix-up. Full verdict + reopen gate:
  // jobflow/docs/handoff/google-jobs.md (probe: scripts/probe_google_jobs.py).
  { id: "google", name: "Google Jobs", status: "active", requiresLogin: false, discovery: true,
    unavailable: "Google now shows job results only to a real browser, so we can't search it for you.",
    description: "Aggregates listings from across the web." },
  { id: "remoteok", name: "RemoteOK", status: "active", requiresLogin: false, discovery: true, description: "Remote-only listings." },
];

// Every platform with an account to connect — the roster the Platforms page lists,
// "coming soon" ones included.
export const CONNECTABLE_PLATFORMS = PLATFORMS.filter((p) => p.connectable);

// The ones a connected login actually buys applications on TODAY (stage "auto").
// Anything that counts connections — the setup checklist, the "N/M connected"
// pills — must use this, not the roster above: LinkedIn is connectable but still
// stage "connect", so counting it made the checklist demand 3/3 while only 2 could
// ever be reached, and the step could never go green. When a platform flips to
// "auto" in the list above, every counter picks it up on its own.
export const LIVE_CONNECTABLE_PLATFORMS = PLATFORMS.filter(
  (p) => p.connectable && p.stage === "auto",
);

export const LOCATIONS: Location[] = [
  { value: "remote", label: "Remote" },
  { value: "usa", label: "United States" },
  { value: "europe", label: "Europe" },
];

// "" = Any (no employment-type filter), same convention WORK_SETTINGS already uses.
// It is a real answer, not a blank: the whole chain already treats an empty job_type as
// "don't filter" — modules/job_type.matches_job_type() returns True for it, and the
// extension's URL builders skip the `jt` / `employment_type[]` param — so the only thing
// missing was a way for the user to SAY it. Without the option the pickers forced a
// narrowing nobody asked for (Igor 09-21).
export const JOB_TYPES: JobType[] = [
  { value: "", label: "Any type" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

// Work setting is a SEPARATE axis from job type (employment type). Remote/Hybrid/On-site.
// "" = Any (no filter). Flows to the extension via the START payload → URL builders
// (LinkedIn uses its native f_WT param; Indeed/ZR bias the query with "hybrid").
export const WORK_SETTINGS: JobType[] = [
  { value: "", label: "Any setting" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export const JOB_STATUSES: JobStatus[] = [
  { value: "new", label: "New", color: "blue" },
  { value: "applied", label: "Applied", color: "yellow" },
  // Written by the extension when the submit click landed but no confirmation page
  // was detected (content.js: result.verified === false). It was in the schema from
  // the start and rendered as the raw string — surfacing it as its own state is the
  // point: "applied" must mean we SAW the confirmation, never "we clicked and hoped".
  { value: "applied_unconfirmed", label: "Sent, unconfirmed", color: "gray" },
  { value: "received", label: "Received", color: "blue" },
  { value: "interview", label: "Interview", color: "green" },
  { value: "interview_invite", label: "Interview", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
];
