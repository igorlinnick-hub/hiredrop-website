"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Dashboard-wide "your turn" alarm for a pending human hand-off (captcha or
 * consent wall). CampaignView has carried this banner since the beginning — but
 * only on /dashboard/campaign, so a user on any other page (or one who missed the
 * chrome.notification, which macOS often swallows) never learned the run was
 * paused (Igor, 09-23). Mounted in DashboardLayout, so every route gets it; it
 * hides itself on the campaign page, which shows the richer in-context banner.
 *
 * Reads the same source as CampaignView: chrome.storage.captchaWaiting over the
 * ping.js bridge (HIREDROP_GET_LIVE_STATE) — set on DETECTION_TRIPPED, cleared on
 * DETECTION_CLEARED / campaign start / stop.
 */

type CaptchaWaiting = {
  url?: string;
  site?: string;
  kind?: string;
  action?: string;
  at?: number;
};

// The extension self-stops after 2h of an uncleared wall — anything older is a
// leftover snapshot, not an active hand-off. Mirrors CampaignView's guard.
const STALE_MS = 2 * 60 * 60 * 1000;

export default function CaptchaAlert() {
  const pathname = usePathname();
  const [captcha, setCaptcha] = useState<CaptchaWaiting | null>(null);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_LIVE_STATE" && e.data.ok) {
        const cw = e.data.captchaWaiting as CaptchaWaiting | null;
        setCaptcha(cw && Date.now() - (cw.at || 0) < STALE_MS ? cw : null);
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_LIVE_STATE" }, "*");
    ask();
    const onVisible = () => { if (!document.hidden) ask(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const iv = setInterval(ask, 5000);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, []);

  if (!captcha || pathname === "/dashboard/campaign") return null;

  const terms = captcha.kind === "terms";
  return (
    <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red/8 border border-red/30">
      <span className="mt-1 inline-block w-2.5 h-2.5 shrink-0 rounded-full bg-red animate-pulse" />
      <div className="text-sm min-w-0 flex-1">
        <p className="font-semibold text-text">
          {terms ? "Your turn: accept the terms" : "Your turn: solve the captcha"}
        </p>
        <p className="text-xs text-text2 mt-0.5">
          {captcha.site || "The site"} is asking for a human — the campaign is paused
          in the automation window until you {terms ? "accept" : "solve it"}, then it
          resumes on its own.
        </p>
      </div>
      <Link href="/dashboard/campaign"
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red/10 text-red
          border border-red/20 hover:bg-red/15 transition whitespace-nowrap">
        Open campaign
      </Link>
    </div>
  );
}
