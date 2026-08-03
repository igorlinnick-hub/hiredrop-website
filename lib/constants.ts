import type { Platform, Location, JobType, JobStatus } from "./types";

// Login/signup URLs verified live 2026-07-10. Indeed, ZipRecruiter and Glassdoor
// use a UNIFIED auth page (enter email → logs in or creates an account), so their
// loginUrl doubles as the signup entry; deep "register" URLs 404. Only Wellfound
// has a distinct signup page (/join).
// `stage` = the honest automation stage shown to users (see Platform type):
// auto = extension applies end-to-end; semi = we fill the employer's ATS form,
// user finishes captcha + submit; connect = login detection only for now.
// Keep these truthful — the badge sets expectations, expectations = trust.
export const PLATFORMS: Platform[] = [
  // Auto-apply via Chrome Extension (native 1-click apply modal — connect your account)
  { id: "indeed", name: "Indeed", status: "active", requiresLogin: true, autoApply: true, connectable: true, stage: "auto",
    loginUrl: "https://secure.indeed.com/auth",
    description: "Largest US job board. Extension auto-applies on your behalf." },
  { id: "ziprecruiter", name: "ZipRecruiter", status: "active", requiresLogin: true, autoApply: true, connectable: true, stage: "auto",
    loginUrl: "https://www.ziprecruiter.com/authn/login?realm=candidates",
    description: "Top US job board with Quick Apply. Extension auto-applies on your behalf." },
  // LinkedIn — Easy Apply only (the 1-click subset; NOT full-LinkedIn nav, which is anti-bot
  // heavy). Type A log-in. stage "connect" = coming soon until the Easy Apply handler ships +
  // passes a careful live test (PLATFORMS_MASTER_PLAN.md Phase 2); flip to "auto" then.
  { id: "linkedin", name: "LinkedIn", status: "active", requiresLogin: true, connectable: true, stage: "connect",
    loginUrl: "https://www.linkedin.com/login",
    description: "Easy Apply — the 1-click roles. #1 US professional network." },
  // Greenhouse — company ATS (not a board you log into). The campaign walks saved
  // apply URLs from the job pool and fills+submits directly; it's near-captcha-free
  // (Enterprise invisible reCAPTCHA) so it runs full-auto with no account to connect.
  // No loginUrl / not connectable on purpose. Marked beta until live-validated.
  { id: "greenhouse", name: "Greenhouse", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Apply on company career sites (Greenhouse ATS) — near-captcha-free, no account needed." },
  // Lever + Ashby — same model as Greenhouse: guest-apply company ATS, no account to
  // connect. The campaign/tap deck walks their saved apply URLs and fills+submits directly.
  // (Lever's per-company hCaptcha = the one human step; Ashby is invisible-reCAPTCHA zero-touch.)
  { id: "lever", name: "Lever", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Apply on company career sites (Lever ATS) — no account needed; you clear the captcha." },
  { id: "ashby", name: "Ashby", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Apply on company career sites (Ashby ATS) — near-captcha-free, no account needed." },
  // REMOVED 2026-08-01 (PLATFORMS_MASTER_PLAN.md §1 "УБИРАЕМ"): Glassdoor (redundant with
  // Indeed, scrape dead), Monster + CareerBuilder (legacy/dying), Dice (tech-only niche),
  // Wellfound (startup niche, scraper dead/SPA → parking lot). Their apply routes through ATS
  // we already handle; keeping them as dead "coming soon" rows just misled users.
  // Public — no account needed to browse/apply.
  { id: "google", name: "Google Jobs", status: "active", requiresLogin: false, discovery: true, description: "Aggregates listings from across the web." },
  { id: "remoteok", name: "RemoteOK", status: "active", requiresLogin: false, discovery: true, description: "Remote-only jobs via public API." },
];

export const LOCATIONS: Location[] = [
  { value: "remote", label: "Remote" },
  { value: "usa", label: "United States" },
  { value: "europe", label: "Europe" },
];

export const JOB_TYPES: JobType[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

export const JOB_STATUSES: JobStatus[] = [
  { value: "new", label: "New", color: "blue" },
  { value: "applied", label: "Applied", color: "yellow" },
  { value: "received", label: "Received", color: "blue" },
  { value: "interview", label: "Interview", color: "green" },
  { value: "interview_invite", label: "Interview", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
];
