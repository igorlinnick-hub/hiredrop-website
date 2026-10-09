/**
 * Typed API client for the HireDrop FastAPI backend.
 * All requests include the Supabase JWT as a Bearer token.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

export class ApiError extends Error {
  /** `detail` is the server's own error body when it is more than a sentence, e.g.
   *  {"error": "pick_an_option", "options": [...]} from POST /profile/facts. */
  status: number;
  detail?: unknown;
  // Plain fields, not parameter properties: Node's type stripping (the test runner) can't run those.
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** The readable part of an error body: FastAPI puts a sentence or a code in `detail`,
 *  and a structured refusal names its code in `detail.error`. */
function errorMessage(body: { message?: unknown; detail?: unknown }, fallback: string): string {
  if (typeof body.message === "string" && body.message) return body.message;
  const d = body.detail;
  if (typeof d === "string" && d) return d;
  if (d && typeof d === "object" && typeof (d as { error?: unknown }).error === "string") {
    return (d as { error: string }).error;
  }
  return fallback;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** One authenticated call to /api/v1. Every verb goes through here, so auth, caching and
 *  error shape are decided once. */
export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorMessage(err, res.statusText), err.detail);
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>("GET", path, token);
}

export function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiRequest<T>("POST", path, token, body);
}

export function apiPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiRequest<T>("PATCH", path, token, body);
}

export function apiDelete<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>("DELETE", path, token);
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

// ── Affiliate payouts (Stripe Connect) ──────────────────────────────────────

/** Start (or resume) Stripe Connect onboarding for the caller's OWN payout account. */
export function createAffiliateConnect(token: string): Promise<BillingUrlResponse> {
  return apiPost<BillingUrlResponse>("/affiliate/payouts/connect", token, {});
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
  /** Rolling window ending now (dashboard "Last 24 hours" tile). applications_today
   *  is the cap's local-day count. Absent on a backend deployed before it. */
  applications_last_24h?: number;
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
  // Today's total budget for this tier + mode; admin gets a 10M "unlimited" sentinel.
  daily_limit?: number;
  tier?: string;
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

// GET /jobs/deck — today's list (daily-30). fits_today counts only the fit judge's passes;
// cards also carry unjudged Indeed postings, which the judge decides at apply time.
export interface DeckResponse {
  cards: (ApiJob & {
    fit_score?: number | null;
    fit_reason?: string | null;
    fit_current?: boolean;
    score?: number;
  })[];
  fits_today?: number;
  off_search?: number;
  keywords?: string[];
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
  location?: string;
  work_setting?: "remote" | "hybrid" | "onsite" | null;
  place?: string | null;
}

export interface CampaignState {
  running: boolean;
  filters?: Record<string, unknown>;
  started_at?: string;
}
