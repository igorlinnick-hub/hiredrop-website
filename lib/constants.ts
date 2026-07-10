import type { Platform, Location, JobType, JobStatus } from "./types";

export const PLATFORMS: Platform[] = [
  // Auto-apply via Chrome Extension (native 1-click apply modal — connect your account)
  { id: "indeed", name: "Indeed", status: "active", requiresLogin: true, autoApply: true, connectable: true,
    loginUrl: "https://secure.indeed.com/account/login", signupUrl: "https://secure.indeed.com/account/register",
    description: "Largest US job board. Extension auto-applies on your behalf." },
  { id: "ziprecruiter", name: "ZipRecruiter", status: "active", requiresLogin: true, autoApply: true, connectable: true,
    loginUrl: "https://www.ziprecruiter.com/authn/login?realm=candidates", signupUrl: "https://www.ziprecruiter.com/authn/registration?realm=candidates",
    description: "Top US job board with Quick Apply. Extension auto-applies on your behalf." },
  // Account-based platforms — connect now; auto-apply support rolls out per the plan.
  { id: "linkedin", name: "LinkedIn", status: "active", requiresLogin: true, connectable: true,
    loginUrl: "https://www.linkedin.com/login", signupUrl: "https://www.linkedin.com/signup",
    description: "Largest professional network. High signal-to-noise." },
  { id: "glassdoor", name: "Glassdoor", status: "active", requiresLogin: true, connectable: true,
    loginUrl: "https://www.glassdoor.com/profile/login_input.htm", signupUrl: "https://www.glassdoor.com/profile/join_input.htm",
    description: "Jobs + company reviews & salaries." },
  { id: "wellfound", name: "Wellfound", status: "active", requiresLogin: true, connectable: true,
    loginUrl: "https://wellfound.com/login", signupUrl: "https://wellfound.com/signup",
    description: "Startup & tech jobs." },
  // Public — no account needed to browse/apply.
  { id: "google", name: "Google Jobs", status: "active", requiresLogin: false, description: "Aggregates listings from across the web." },
  { id: "remoteok", name: "RemoteOK", status: "active", requiresLogin: false, description: "Remote-only jobs via public API." },
  { id: "craigslist", name: "Craigslist", status: "active", requiresLogin: false, description: "Local US jobs across 20 major cities." },
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
