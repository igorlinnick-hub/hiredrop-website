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

const read = createSharedRead((token) =>
  apiGet<CampaignStatusResponse>("/campaign/status", token),
);

export function readCampaignStatus(
  token: string,
  maxAgeMs: number,
): Promise<CampaignStatusResponse> {
  return read(token, maxAgeMs);
}
