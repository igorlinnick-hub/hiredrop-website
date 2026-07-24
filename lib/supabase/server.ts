import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// See lib/supabase/client.ts for the rationale: @supabase/ssr throws on empty
// creds, which crashes the build's prerender/SSR when env vars are absent (e.g.
// a Preview build without secrets). Placeholder fallback keeps the build green;
// real deploys inject the real values, so this branch never runs there.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

export async function createClient() {
  const cookieStore = await cookies();

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() || PLACEHOLDER_URL;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/\s+/g, "") || PLACEHOLDER_KEY;

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
