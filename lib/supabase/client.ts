import { createBrowserClient } from "@supabase/ssr";

// A client-component page that calls createClient() at its top level (e.g.
// /auth/update-password) is rendered once during `next build`'s prerender pass.
// If NEXT_PUBLIC_SUPABASE_* is absent there — as it is in any Preview build
// without env vars wired — @supabase/ssr throws "URL and API key are required"
// and the export phase exits on the FIRST such page, taking down the ENTIRE
// build (not just that page), blocking every unrelated deploy.
//
// Fall back to placeholder creds so construction never throws. This branch only
// runs when the vars are genuinely missing; in a real deploy the NEXT_PUBLIC_*
// values are inlined at build time, so the real client is always used. The warn
// surfaces a true misconfiguration without bricking the build.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/\s+/g, "");
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.warn("[supabase] NEXT_PUBLIC_SUPABASE_* missing — using placeholder; auth will not work in this environment");
    }
    return createBrowserClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }
  return createBrowserClient(url, key);
}
