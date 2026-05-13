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
}
