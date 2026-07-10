const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

export interface RedeemResult {
  ok: boolean;
  tier?: string;
  expires_at?: string | null;
  already?: boolean;
  error?: string;
}

/**
 * Redeem a promo code for the signed-in user. The code is validated entirely
 * server-side — the client never reads the codes table. Requires the user's
 * Supabase access token.
 */
export async function redeemPromoCode(code: string, token: string): Promise<RedeemResult> {
  const trimmed = (code || "").trim();
  if (!trimmed) return { ok: false, error: "No code provided" };
  try {
    const res = await fetch(`${API_BASE}/api/v1/promo/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: trimmed }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.detail || data.error || "Could not redeem code" };
    }
    return data as RedeemResult;
  } catch {
    return { ok: false, error: "Network error — try again" };
  }
}
