import { apiGet, type CampaignStatusResponse } from "@/lib/api";
import { createSharedRead } from "@/lib/campaign/shared-read";

/**
 * GET /campaign/status for client panels, shared across the page.
 *
 * The home dashboard polled it from three places at once — QuickActions every
 * 5 s, the tap dock every 8 s, Drop every 10 s — 25 requests a minute for one
 * answer (measured 10-05). Each panel keeps its own clock and passes
 * pollMaxAge(itsInterval): half its interval. The fastest poller on the screen
 * mostly does the asking and the others read its answer; what a panel shows is
 * at most 1.5x its interval old (it was 1x) — a full interval would have
 * doubled it.
 *
 * Pass maxAgeMs = 0 right after Start/Stop, when only a fresh answer will do.
 */
export const pollMaxAge = (intervalMs: number) => intervalMs / 2;

/**
 * `&tz=<IANA zone>` for /campaign/status, or "" when the browser can't tell.
 *
 * The backend stores the zone (backend #345) so the daily CAP rolls over at the
 * user's own midnight, and counts "today" from that same stored midnight. This is
 * the only place a zone reaches it: without it everyone stays on the UTC day and
 * the number shown differs from the cap enforced. Sent from every client poll, not
 * just the campaign screen, so the zone is on file whichever page the user opens.
 */
export function zoneParam(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? `&tz=${encodeURIComponent(tz)}` : "";
  } catch {
    return ""; // old browser
  }
}

const read = createSharedRead((token) =>
  apiGet<CampaignStatusResponse>(`/campaign/status?${zoneParam().slice(1)}`, token),
);

export function readCampaignStatus(
  token: string,
  maxAgeMs: number,
): Promise<CampaignStatusResponse> {
  return read(token, maxAgeMs);
}
