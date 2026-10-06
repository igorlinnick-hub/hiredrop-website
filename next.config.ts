import type { NextConfig } from "next";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app").trim();
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://msxjcjzmfruizbgkssxo.supabase.co").trim();
const SUPABASE_WSS = SUPABASE_URL.replace(/^https:/, "wss:");
const isDev = process.env.NODE_ENV === "development";

// The full policy, ENFORCED. Browsers block what is not listed and POST each
// violation to the backend, which logs one `[csp] directive=…` line per hour
// (jobflow app/routers/csp.py). Moved here 10-06 after a clean report-only week.
// Without nonces on purpose: a nonce forces every page to render dynamically,
// so script-src keeps 'unsafe-inline' (Next's own inline bootstrap needs it).
// What it still buys: no script, fetch, frame or font from an origin not
// listed here; no <object>, no <base> hijack, forms post only to us.
// Stripe Checkout/Portal is a navigation, not a load — CSP doesn't govern it.
const CSP = [
  "frame-ancestors 'self'", // nobody may frame the app (Start/Stop/billing); same-origin only
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://accounts.google.com/gsi/client", // Google sign-in (GoogleButton)
    "https://connect.facebook.net", // Meta pixel
    "https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com", // Google Ads tag
    "https://va.vercel-scripts.com https://vercel.live", // Vercel analytics debug + preview toolbar
  ].join(" "),
  // Fonts are self-hosted since web #261 (lib/fonts.ts) — no Google Fonts origins.
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "font-src 'self' data:",
  [
    "img-src 'self' data: blob:",
    SUPABASE_URL, // signed storage URLs (submission proof)
    "https://tiles.openfreemap.org",
    "https://www.facebook.com https://www.google.com https://googleads.g.doubleclick.net https://www.googletagmanager.com",
    "https://connect.facebook.net", // the pixel's image beacon (report on /signup, 10-06)
  ].join(" "),
  [
    // data: — a library reading an inline resource via fetch (report on /dashboard/settings,
    // 10-06). Can't send anything out: the bytes are already in the page.
    "connect-src 'self' data:",
    API_URL,
    SUPABASE_URL,
    SUPABASE_WSS,
    "https://accounts.google.com/gsi/",
    "https://tiles.openfreemap.org https://nominatim.openstreetmap.org", // radius map
    "https://www.facebook.com https://connect.facebook.net",
    "https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.googletagmanager.com",
    "https://ad.doubleclick.net", // gtag posts /ccm/s/collect here on page view (caught by a test build, 10-05)
    "https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  ].join(" "),
  [
    "frame-src 'self' blob:",
    SUPABASE_URL, // resume preview iframe (signed storage URL)
    "https://accounts.google.com/gsi/",
    "https://td.doubleclick.net https://www.googletagmanager.com https://vercel.live",
  ].join(" "),
  "worker-src 'self' blob:", // maplibre
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `report-uri ${API_URL}/api/v1/csp-report`,
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

// Sent on every response. Deliberately NOT here yet:
// - HSTS `preload` — submitting to the browsers' preload list is close to
//   permanent; includeSubDomains alone does the protecting.
// - camera/microphone/geolocation are unused; clipboard IS used (copy-link
//   buttons) and identity-credentials-get backs Google sign-in (FedCM), so
//   neither is restricted.
const SECURITY_HEADERS = [
  // HTTPS on every subdomain, not just the apex Vercel covers by default.
  // The only web names are the apex and www. www MUST stay attached to the Vercel
  // project (redirect → apex), or it is served the apex-only certificate and, with
  // includeSubDomains, becomes a hard un-clickable TLS error — it was missing
  // until 10-05 (#272 → rollback #274 → domain added, cert issued). Check:
  //   curl -sS -o /dev/null -w '%{http_code}\n' https://www.hiredrop.io/   → 308
  // Every other name in the zone is mail (MX/SPF/DKIM), never loaded by a browser.
  // A NEW web subdomain must be added to Vercel (with its cert) before any link to it.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Nobody may frame the app (clickjacking on Start/Stop/billing). Same-origin
  // framing stays allowed; the app itself only frames resume previews.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: CSP },
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
