"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import {
  ADS_CONFIGURED,
  browserAdsOptedOut,
  clearPendingSignup,
  guardStorage,
  isTrackablePage,
  pendingSignupUserId,
  signupConversionFired,
} from "@/lib/adPixels";

// The tags live in their own chunk: fetched only when a page qualifies, never
// with nothing configured, never for an opted-out visitor.
const AdPixelRuntime = dynamic(() => import("./AdPixelRuntime"), { ssr: false });

type Plan = "none" | "public" | "signup-only";

const noSubscribe = () => () => {};

/**
 * What this page gets. Browser-only: the server always renders "none", so no
 * tag ever reaches the HTML — an opted-out visitor's browser is never even
 * told where the scripts live.
 */
function planFor(pathname: string): Plan {
  if (!ADS_CONFIGURED || browserAdsOptedOut()) return "none";
  if (isTrackablePage(pathname, window.location.search, window.location.hash)) return "public";
  const pending = pendingSignupUserId();
  return pending && !signupConversionFired(pending, guardStorage()) ? "signup-only" : "none";
}

/**
 * Meta Pixel + Google Ads tag, mounted once in the root layout. Renders
 * nothing — and runs nothing — unless NEXT_PUBLIC_META_PIXEL_ID or
 * NEXT_PUBLIC_GOOGLE_ADS_ID is set. Rules live in lib/adPixels.ts.
 */
export default function AdPixels() {
  const pathname = usePathname() ?? "";
  // false on the server and during hydration, true afterwards — the plan is
  // read from cookies/navigator, which only exist in the browser.
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  const plan: Plan = inBrowser ? planFor(pathname) : "none";

  // A pending sign-up that will never be reported here is dropped, not
  // carried around: the visitor opted out, or this browser already sent it.
  useEffect(() => {
    if (!ADS_CONFIGURED) return;
    const pending = pendingSignupUserId();
    if (pending && (browserAdsOptedOut() || signupConversionFired(pending, guardStorage()))) {
      clearPendingSignup();
    }
  }, [pathname]);

  if (plan === "none") return null;
  return <AdPixelRuntime plan={plan} pathname={pathname} />;
}
