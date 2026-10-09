export interface UserProfile {
  name: string;
  last_name: string;
  email: string;
  phone: string;
  keywords: string[];
  location: string;
  job_type: string;
  // Remote / hybrid / onsite — a separate axis from job_type. "" or absent = Any.
  work_setting?: string;
  platforms: string[];
  writing_style: string;
  linkedin_url: string;
  portfolio_url: string;
  // Mailing address — some application forms (ZipRecruiter's contact step) refuse to
  // submit while these are blank, even though they label them Optional. The filler never
  // invents a value; a missing address means the job is handed back instead.
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  // Current employment — "current company / employer / job title" is the single
  // biggest hand-back cause on ATS forms (12 of 21 required blanks on the 320-form
  // measure). Filled from here; blank means the filler hands the job back.
  current_employer?: string;
  current_title?: string;
  // Education — Greenhouse's required "School" / "Degree". Asked at signup; `no_degree`
  // is an answer (the filler hands a required School back instead of inventing one).
  school?: string;
  degree?: string;
  no_degree?: boolean;
  // What we tell an employer who asks about pay — the user's own words. NOT the
  // salary_min search filter, which only decides which jobs they see.
  salary_expectation?: string;
  no_salary_expectation?: boolean;
  // Screener-answer fields the extension's deterministic handlers use to fill the
  // most frequent required application questions (work auth / sponsorship / notice /
  // English) — honestly, from the user, never guessed on a knockout.
  work_authorized_us: boolean | null;
  needs_sponsorship: boolean | null;
  notice_period: string;
  english_level: string;
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
  beta?: boolean; // newly enabled — shown with a "beta" marker on its chip
  connectable?: boolean; // account-based platform — user logs in / registers to connect
  discovery?: boolean; // backend can fetch listings from it ("Find jobs from" chips)
  // Set when a source is KNOWN dead — the honest reason, shown as a "Paused" line.
  // An unavailable platform is never selectable: offering a pick that returns nothing
  // is worse than not offering it. Mirrors JobPlatform.unavailable_reason on the backend.
  unavailable?: string;
  // Honest automation stage — drives the badge on the connections panel:
  //   "auto"    extension applies end-to-end (pauses only for a captcha)
  //   "semi"    listings feed the board; we fill the employer's ATS form, the
  //             user finishes the last human step (captcha + submit)
  //   "connect" login detection only — auto-apply support still rolling out
  stage?: "auto" | "semi" | "connect";
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
  // Fit judge verdict for the CURRENT profile (GET /jobs/deck, daily-30). fit_current
  // false = nobody judged this posting for today's resume (Indeed is not prejudged yet) —
  // the judge decides it at apply time, and the card must not pretend otherwise.
  fit_score?: number | null;
  fit_reason?: string | null;
  fit_current?: boolean;
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
  link?: string; // job posting URL (snapshot — survives job-row deletion)
  date_applied: string;
  status: string;
  cover_letter?: string;
  tailored_resume?: string;
  resume_pdf_url?: string; // signed URL to the ATS PDF we actually submitted (1h TTL)
  // Where the job is (GET /applications/history, backend modules/job_location.py):
  // the board's own text, what it says about the arrangement, and its "City, ST".
  // Empty/null = we never saw a location — History counts it as such, never guesses.
  location?: string;
  work_setting?: "remote" | "hybrid" | "onsite" | null;
  place?: string | null;
  // The employer's form questions and the answers we gave in the person's name, captured
  // right before submit (ext collectFormAnswers). Empty for older applications.
  form_answers?: { q: string; a: string }[];
}
