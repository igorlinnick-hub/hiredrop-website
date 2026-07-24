"use client";

import { useEffect } from "react";
import { captureAttributionFromUrl } from "@/lib/attribution";

/** Invisible: stores first-touch utm/ref params on any landing page. */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttributionFromUrl();
  }, []);
  return null;
}
