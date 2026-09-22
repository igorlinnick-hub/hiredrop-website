"use client";

import { useEffect } from "react";
import { captureAttributionFromUrl, reportReferralOpen } from "@/lib/attribution";

/** Invisible: stores first-touch utm/ref params, and counts every ?ref= open. */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttributionFromUrl();
    // Every visit, not just the first: the first records WHO gets credit, this
    // records that the link was opened at all.
    reportReferralOpen();
  }, []);
  return null;
}
