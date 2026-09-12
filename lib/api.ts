/**
 * Typed API client for the HireDrop FastAPI backend.
 * All requests include the Supabase JWT as a Bearer token.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || body.detail || res.statusText);
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, token: string): Promise<T> {
  return request<T>(path, token);
}

export function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  return request<T>(path, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  return request<T>(path, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ── Billing (Stripe) ─────────────────────────────────────────────────────────

export interface BillingUrlResponse {
  url: string;
}

/** Start a Stripe Checkout session for a plan; caller redirects to `.url`. */
export function createCheckout(plan: string, token: string): Promise<BillingUrlResponse> {
  return apiPost<BillingUrlResponse>("/billing/checkout", token, { plan });
}

/** Open the Stripe Billing Portal (manage / cancel); caller redirects to `.url`. */
export function openBillingPortal(token: string): Promise<BillingUrlResponse> {
  return apiPost<BillingUrlResponse>("/billing/portal", token, {});
}

// ── Interview kit ────────────────────────────────────────────────────────────

export interface InterviewQuestion {
  q: string;
  why: string;
  bullets: string[];
  proof: string;
}

export interface InterviewKit {
  company_brief: { one_liner: string; facts: string[] };
  your_angle: string;
  tell_me_about_yourself: string[];
  questions: InterviewQuestion[];
  gaps: { gap: string; say: string }[];
  ask_them: string[];
}

/** `ready` splits the union: with a kit, or with the reason there isn't one yet. */
export interface InterviewKitResponse {
  ready: boolean;
  kit?: InterviewKit;
  generated_at?: string | null;
  schema_version?: number;
  can_generate?: boolean;
  reason?: string;
  title?: string;
  company?: string;
  link?: string;
}

/** Read the cached kit. Never generates — safe to call on page load. */
export function getInterviewKit(
  applicationId: string,
  token: string
): Promise<InterviewKitResponse> {
  return apiGet<InterviewKitResponse>(`/applications/${applicationId}/interview-kit`, token);
}

/** Generate the kit (costs one AI call, cached server-side afterwards). */
export function createInterviewKit(
  applicationId: string,
  token: string
): Promise<InterviewKitResponse> {
  return apiPost<InterviewKitResponse>(`/applications/${applicationId}/interview-kit`, token, {});
}

// ── Typed response shapes ────────────────────────────────────────────────────

export interface StatsResponse {
  total_jobs: number;
  total_applications: number;
  applications_today: number;
  new_today: number;
  tier: "free" | "pro" | "premium" | "elite" | "admin";
  daily_limit: number;
  remaining_today: number;
  platform_counts: Record<string, number>;
  max_per_platform: number;
  // Free taste (lifetime 40-app cap) — null for paid/admin tiers, and absent
  // entirely from backends deployed before the feature; treat missing as null.
  free_used?: number | null;
  free_limit?: number | null;
}

export interface CampaignStatusResponse {
  running: boolean;
  filters: Record<string, unknown>;
  started_at: string | null;
  today_applications: number;
  platform_counts: Record<string, number>;
  limit_per_platform: number;
  jobs_ready: number;
  // Swipes approved on the Tap deck that are still undone. Reported in every mode —
  // only a tap run consumes them, so in auto this is a stranded stack (#185).
  approved_waiting?: number;
  // The profile's submit mode, and whether the backend actually KNEW it (vs the
  // conservative "auto" fallback) — "не знаю" has no single safe default.
  submit_mode?: string;
  submit_mode_known?: boolean;
  free_used?: number | null;
  free_limit?: number | null;
}

export interface ApiJob {
  id: string;
  title: string;
  company: string;
  platform: string;
  status: string;
  date_found: string;
  link: string;
  description?: string;
}

export interface ApiApplication {
  id: string;
  job_id?: string;
  title: string;
  company: string;
  platform: string;
  link: string;
  date_applied: string;
  status: string;
  cover_letter?: string;
}

export interface CampaignState {
  running: boolean;
  filters?: Record<string, unknown>;
  started_at?: string;
}
