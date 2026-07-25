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
  // Greenhouse — company ATS (not a board you log into). The campaign walks saved
  // apply URLs from the job pool and fills+submits directly; it's near-captcha-free
  // (Enterprise invisible reCAPTCHA) so it runs full-auto with no account to connect.
  // No loginUrl / not connectable on purpose. Marked beta until live-validated.
  { id: "greenhouse", name: "Greenhouse", status: "active", requiresLogin: false, autoApply: true, beta: true, stage: "auto",
    description: "Apply on company career sites (Greenhouse ATS) — near-captcha-free, no account needed." },
  // Discovery platforms — their listings feed the board; applications happen on
  // the employer's ATS (Greenhouse/Lever), where we fill and the user finishes.
  { id: "glassdoor", name: "Glassdoor", status: "active", requiresLogin: true, connectable: true, discovery: true, stage: "semi",
    loginUrl: "https://www.glassdoor.com/member/profile/login",
    description: "Jobs + company reviews & salaries." },
  { id: "wellfound", name: "Wellfound", status: "active", requiresLogin: true, connectable: true, discovery: true, stage: "semi",
    loginUrl: "https://wellfound.com/login", signupUrl: "https://wellfound.com/join",
    description: "Startup & tech jobs." },
  // Monster and CareerBuilder merged (2024) — they share one identity account
  // (identity.monster.com), so signing up on either connects you to both.
  { id: "monster", name: "Monster", status: "active", requiresLogin: true, connectable: true, stage: "connect",
    loginUrl: "https://www.monster.com/profile",
    description: "Major US job board. Same account works on CareerBuilder." },
  { id: "careerbuilder", name: "CareerBuilder", status: "active", requiresLogin: true, connectable: true, stage: "connect",
    loginUrl: "https://www.careerbuilder.com/profile/valid-profile-continue?redirectUri=%2F&mode=Login",
    signupUrl: "https://www.careerbuilder.com/profile/valid-profile-continue?redirectUri=%2F&mode=SignUp",
    description: "Major US job board. Same account works on Monster." },
  { id: "dice", name: "Dice", status: "active", requiresLogin: true, connectable: true, stage: "connect",
    loginUrl: "https://www.dice.com/dashboard/login",
    description: "Tech & IT jobs — engineering, data, cloud." },
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
  { value: "interview", label: "Interview 🎉", color: "green" },
  { value: "interview_invite", label: "Interview 🎉", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
];
