/**
 * Typed API client for the JobFlow FastAPI backend.
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

// ── Typed response shapes ────────────────────────────────────────────────────

export interface StatsResponse {
  total_jobs: number;
  total_applications: number;
  applications_today: number;
  new_today: number;
  tier: "free" | "pro" | "elite" | "admin";
  daily_limit: number;
  remaining_today: number;
  platform_counts: Record<string, number>;
  max_per_platform: number;
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
