import type { Platform, Location, JobType, JobStatus } from "./types";

export const PLATFORMS: Platform[] = [
  // Auto-apply via Chrome Extension
  { id: "indeed", name: "Indeed", status: "active", requiresLogin: false, autoApply: true, description: "Largest US job board. Extension auto-applies on your behalf." },
  // Discovery — server scrapes, you apply externally
  { id: "linkedin", name: "LinkedIn", status: "active", requiresLogin: false, description: "Largest professional network. High signal-to-noise." },
  { id: "glassdoor", name: "Glassdoor", status: "active", requiresLogin: false, description: "Jobs + company reviews & salaries." },
  { id: "ziprecruiter", name: "ZipRecruiter", status: "active", requiresLogin: false, autoApply: true, description: "Top US job board with Quick Apply. Extension auto-applies on your behalf." },
  { id: "google", name: "Google Jobs", status: "active", requiresLogin: false, description: "Aggregates listings from across the web." },
  { id: "remoteok", name: "RemoteOK", status: "active", requiresLogin: false, description: "Remote-only jobs via public API." },
  { id: "wellfound", name: "Wellfound", status: "active", requiresLogin: false, description: "Startup & tech jobs." },
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
