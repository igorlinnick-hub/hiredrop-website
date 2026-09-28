"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

import { gtagInitCode, gtagSrc, metaBaseCode } from "@/lib/adPixelCode";
import {
  GOOGLE_ADS_ID,
  META_PIXEL_ID,
  browserAdsOptedOut,
  claimSignupConversion,
  clearPendingSignup,
  firePageView,
  fireSignupConversion,
  guardStorage,
  pendingSignupUserId,
} from "@/lib/adPixels";

/**
 * The tags themselves. Loaded lazily by components/AdPixels.tsx, only once it
 * has decided this page gets them — so a visitor who never qualifies never
 * downloads this code either.
 *
 * "public"      = pixels + a page view for each public route;
 * "signup-only" = a product page carrying a fresh sign-up: pixels for that
 *                 one conversion, no page view.
 */
export default function AdPixelRuntime({
  plan,
  pathname,
}: {
  plan: "public" | "signup-only";
  pathname: string;
}) {
  const lastPageView = useRef<string | null>(null);

  // Runs after the <Script> children below have injected the fbq/gtag stubs
  // (child effects run before the parent's in the same commit), so the calls
  // are queued even while fbevents.js / gtag.js are still downloading.
  useEffect(() => {
    if (browserAdsOptedOut()) return;

    if (plan === "public" && lastPageView.current !== pathname) {
      lastPageView.current = pathname;
      firePageView();
    }

    const userId = pendingSignupUserId();
    if (userId) {
      // Cookie first, then the localStorage guard: either one alone is
      // enough to stop a second fire.
      clearPendingSignup();
      if (claimSignupConversion(userId, guardStorage())) fireSignupConversion(userId);
    }
  }, [plan, pathname]);

  return (
    <>
      {META_PIXEL_ID && (
        <Script
          id="hd-meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: metaBaseCode(META_PIXEL_ID) }}
        />
      )}
      {GOOGLE_ADS_ID && (
        <>
          <Script
            id="hd-gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: gtagInitCode(GOOGLE_ADS_ID) }}
          />
          <Script id="hd-gtag-src" strategy="afterInteractive" src={gtagSrc(GOOGLE_ADS_ID)} />
        </>
      )}
    </>
  );
}
