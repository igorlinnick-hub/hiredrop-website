import type { NextConfig } from "next";

// Sent on every response. Deliberately NOT here yet:
// - a full Content-Security-Policy — GIS sign-in, Stripe, Supabase, Vercel
//   analytics and the ad pixels each need allow-listing; it ships Report-Only
//   first, separately, so a missed origin can't break login.
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
