import type { NextConfig } from "next";

const origin = (u: string | undefined, fallback: string) => {
  try { return new URL((u || "").trim() || fallback).origin; } catch { return fallback; }
};
const SUPABASE = origin(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://msxjcjzmfruizbgkssxo.supabase.co");
const API = origin(process.env.NEXT_PUBLIC_API_URL, "https://web-production-db45.up.railway.app");
const MAP_STYLES = [process.env.NEXT_PUBLIC_MAP_STYLE_URL, process.env.NEXT_PUBLIC_MAP_STYLE_DARK_URL]
  .map((u) => origin(u, "https://tiles.openfreemap.org"));

// Full policy, REPORT-ONLY: the browser blocks nothing, it posts every
// violation to /api/csp-report (logged as `[csp]`). Enforce once a week of
// real traffic reports nothing unexpected — a missed origin in an enforced
// policy breaks Google sign-in or the pixels silently, for everyone.
//
// Inline scripts stay allowed: Next streams its RSC payload as inline
// <script> tags, and nonces would force every static page to render per
// request. What the policy does buy: scripts, frames and outbound requests
// only to the origins below — an injected script cannot load from or send
// data to anywhere else. Origins, by owner:
//   GIS sign-in       accounts.google.com (script, style, frame, FedCM fetch)
//   Meta pixel        connect.facebook.net (script), www.facebook.com (beacon)
//   Google Ads tag    googletagmanager / googleadservices / doubleclick / google.com
//                     (gtag posts to ad.doubleclick.net/ccm — caught by a test build)
//   Supabase          REST, auth, storage (signed resume previews), realtime wss
//   Backend           Railway API (fetch + resume preview iframe)
//   Radius map        openfreemap style/tiles, nominatim geocoder, blob workers
//   Vercel analytics  same-origin /_vercel/*
const GOOGLE_ADS = [
  "https://www.googletagmanager.com",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://www.google.com",
];
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://accounts.google.com https://connect.facebook.net ${GOOGLE_ADS.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Beacons (pixel <img>), map tiles, avatars, submission screenshots.
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace("https://", "wss://")} ${API} ${[...new Set(MAP_STYLES)].join(" ")} https://nominatim.openstreetmap.org https://accounts.google.com https://www.facebook.com https://connect.facebook.net ${GOOGLE_ADS.join(" ")} https://td.doubleclick.net https://ad.doubleclick.net`,
  `frame-src 'self' blob: ${SUPABASE} ${API} https://accounts.google.com https://www.googletagmanager.com https://td.doubleclick.net`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // report-uri only. With `report-to` present Chrome drops report-uri and
  // queues reports for the Reporting API instead — measured 10-04 on a local
  // build: report-uri arrived at once, report-to never arrived in 70 s.
  "report-uri /api/csp-report",
].join("; ");

// Sent on every response. Deliberately NOT here yet:
// - an ENFORCED full Content-Security-Policy — see CSP_REPORT_ONLY above.
// - HSTS includeSubDomains — Vercel already sends max-age=63072000 for the apex;
//   widening it to every subdomain is a DNS audit, not a config line.
// - camera/microphone/geolocation are unused; clipboard IS used (copy-link
//   buttons) and identity-credentials-get backs Google sign-in (FedCM), so
//   neither is restricted.
const SECURITY_HEADERS = [
  // Nobody may frame the app (clickjacking on Start/Stop/billing). Same-origin
  // framing stays allowed; the app itself only frames resume previews.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// public/ art is served with max-age=0 by default, so every visit re-validated
// 300–500 KB photos. A day fresh + a week stale-while-revalidate instead of
// `immutable`: these files are replaced in place under the same name (character
// poses, step photos), and a year-long immutable cache would pin the old art.
const PUBLIC_ART_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to THIS project. Without it, a stray lockfile in the
  // home directory made Turbopack infer ~ as the root and watch the entire home folder,
  // pegging CPU + fseventsd during dev (which starved chunk serving → unstyled renders).
  // Dev-only — ignored by the production build.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      ...["bg", "people", "illustrations", "onboarding", "character"].map((dir) => ({
        source: `/${dir}/:path+`,
        headers: [{ key: "Cache-Control", value: PUBLIC_ART_CACHE }],
      })),
      { source: "/favicon.ico", headers: [{ key: "Cache-Control", value: PUBLIC_ART_CACHE }] },
    ];
  },
};

export default nextConfig;
