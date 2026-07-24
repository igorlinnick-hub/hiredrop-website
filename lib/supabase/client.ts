import { createBrowserClient } from "@supabase/ssr";

// Guard the env reads: a client-component page (e.g. /auth/update-password) that
// calls createClient() at its top level is rendered once during `next build`'s
// prerender pass. If NEXT_PUBLIC_SUPABASE_URL is missing there — as it is in any
// Preview build without the env vars wired — a bare `!.trim()` throws and takes
// down the ENTIRE build, not just that page. Falling back to "" keeps the build
// green; at runtime these NEXT_PUBLIC_* values are inlined, so a correctly
// configured deploy still gets the real credentials.
export function createClient() {
  return createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/\s+/g, "")
  );
}
