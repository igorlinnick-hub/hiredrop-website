import type { Platform, Location, JobType, JobStatus } from "./types";

export const PLATFORMS: Platform[] = [
  { id: "remoteok", name: "RemoteOK", status: "active", requiresLogin: false, description: "Remote jobs aggregator. No login needed.", costTier: "free" },
  { id: "indeed", name: "Indeed", status: "active", requiresLogin: true, description: "Largest job board. Supports auto-apply.", costTier: "standard" },
  { id: "wellfound", name: "Wellfound", status: "active", requiresLogin: true, description: "Startup & tech jobs.", costTier: "standard" },
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
  { value: "interview", label: "Interview", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
];
