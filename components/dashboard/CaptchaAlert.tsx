"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Dashboard-wide "your turn" block for a pending human hand-off (captcha or
 * consent wall). CampaignView has carried a banner since the beginning — but
 * only on /dashboard/campaign, so a user on any other page (or one whose macOS
 * swallowed the chrome.notification) never learned the run was paused (Igor,
 * 09-23). Mounted in DashboardLayout, so every route gets it; it hides itself
 * on the campaign page, which shows the richer in-context banner.
 *
 * Look: NOT a red banner (Igor, 09-24 — "красного не надо") — the poster-panel
 * language already approved on the skills dialog and the affiliate hero
 * (AffiliateHero.tsx): dark ground, our own warm render as the photography,
 * serif headline with the emphasis in an italic word, one pale pill. Default
 * shape is the "wide" panel (Igor picked it over the cube on 09-25 — the block
 * spans the content column, so the hand-off reads at a glance from across the
 * room rather than sitting in a corner); the cube variant lives on
 * /preview/captcha-alert for comparison.
 *
 * Reads the same source as CampaignView: chrome.storage.captchaWaiting over the
 * ping.js bridge (HIREDROP_GET_LIVE_STATE) — set on DETECTION_TRIPPED, cleared
 * on DETECTION_CLEARED / campaign start / stop.
 */

const SERIF = "'Instrument Serif', 'Playfair Display', Georgia, serif";

export type CaptchaWaiting = {
  url?: string;
  site?: string;
  kind?: string;
  action?: string;
  at?: number;
};

export type CaptchaShape = "cube" | "wide";

// The extension self-stops after 2h of an uncleared wall — anything older is a
// leftover snapshot, not an active hand-off. Mirrors CampaignView's guard.
const STALE_MS = 2 * 60 * 60 * 1000;

/** Presentational half — the preview page renders it directly with fake data. */
export function CaptchaPanel({
  captcha,
  shape = "wide",
}: {
  captcha: CaptchaWaiting;
  shape?: CaptchaShape;
}) {
  const terms = captcha.kind === "terms";
  const site = captcha.site || "The site";
  const headline = terms ? (
    <>Accept the <i>terms</i></>
  ) : (
    <>Solve the <i>captcha</i></>
  );
  const body = terms
    ? `${site} wants you to accept its terms in the automation window. The campaign resumes on its own after.`
    : `${site} is asking for a human check. Solve it in the automation window — everything else is filled. The campaign resumes on its own.`;

  if (shape === "wide") {
    return (
      <section className="relative overflow-hidden rounded-[20px]" style={{ background: "#0A0710" }}>
        {/* Our own render (well-night) — the same warm out-of-focus ground the
            reference uses; never a stock photo. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bg/well-night.jpg" alt="" aria-hidden
          className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{
          background:
            "linear-gradient(100deg, rgba(8,5,14,.95) 0%, rgba(8,5,14,.86) 42%, rgba(8,5,14,.30) 75%, rgba(8,5,14,.06) 100%)",
        }} />
        <div className="relative p-7 sm:p-8 max-w-xl">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Campaign paused — your turn
          </p>
          <h3 className="text-white text-[28px] leading-[1.08] sm:text-[32px]"
            style={{ fontFamily: SERIF, letterSpacing: "-0.015em" }}>
            {headline}
          </h3>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-white/70">{body}</p>
          <Link href="/dashboard/campaign"
            className="mt-5 inline-block rounded-full bg-[#F3EFE7] px-6 py-2.5 text-[13.5px] font-semibold text-[#14100C] transition hover:bg-white">
            Open campaign
          </Link>
        </div>
      </section>
    );
  }

  // The cube — the compact square alternative: the render fills the whole block
  // and the type sits on a darkened floor. Kept on /preview/captcha-alert.
  return (
    <section
      className="relative overflow-hidden rounded-[20px] w-full max-w-[340px] aspect-square"
      style={{ background: "#0A0710" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bg/well-night.jpg" alt="" aria-hidden
        className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background:
          "linear-gradient(180deg, rgba(8,5,14,.30) 0%, rgba(8,5,14,.12) 32%, rgba(8,5,14,.62) 62%, rgba(8,5,14,.92) 100%)",
      }} />
      <div className="relative flex h-full flex-col justify-end p-6">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/60">
          Campaign paused — your turn
        </p>
        <h3 className="text-white text-[27px] leading-[1.08]"
          style={{ fontFamily: SERIF, letterSpacing: "-0.015em" }}>
          {headline}
        </h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">{body}</p>
        <Link href="/dashboard/campaign"
          className="mt-4 inline-block self-start rounded-full bg-[#F3EFE7] px-5 py-2 text-[13px] font-semibold text-[#14100C] transition hover:bg-white">
          Open campaign
        </Link>
      </div>
    </section>
  );
}

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

  return (
    <div className="mb-6">
      <CaptchaPanel captcha={captcha} shape="wide" />
    </div>
  );
}
