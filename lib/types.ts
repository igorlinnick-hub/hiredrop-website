export interface UserProfile {
  name: string;
  last_name: string;
  email: string;
  phone: string;
  keywords: string[];
  location: string;
  job_type: string;
  platforms: string[];
  writing_style: string;
  resume_url: string | null;
  onboarding_completed: boolean;
}

export interface Platform {
  id: string;
  name: string;
  status: "active";
  requiresLogin: boolean;
  description: string;
  autoApply?: boolean; // supports Chrome Extension auto-apply
  connectable?: boolean; // account-based platform — user logs in / registers to connect
  discovery?: boolean; // backend can fetch listings from it ("Find jobs from" chips)
  loginUrl?: string; // opens the platform's log-in page
  signupUrl?: string; // opens the platform's create-account page
}

export interface Location {
  value: string;
  label: string;
}

export interface JobType {
  value: string;
  label: string;
}

export interface JobStatus {
  value: string;
  label: string;
  color: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  platform: string;
  status: string;
  date_found: string;
  link: string;
  description?: string;
  score?: number;
  ai_verdict?: string;
  ai_flags?: string[];
  ats_keywords?: string[];
  ats_match_pct?: number;
  tailored_resume?: string;
}

export interface Application {
  id: string;
  job_id: string;
  title: string;
  company: string;
  platform: string;
  date_applied: string;
  status: string;
  cover_letter?: string;
  tailored_resume?: string;
}
