import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // Same guard as the browser client: a missing env var must not crash the build's
  // prerender/SSR pass. Empty-string fallback keeps the build green; real deploys
  // have the values inlined/injected.
  return createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/\s+/g, ""),
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
