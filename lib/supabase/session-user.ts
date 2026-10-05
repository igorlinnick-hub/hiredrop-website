import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * The signed-in user for client components — read from the browser's own
 * session, no request to the auth service.
 *
 * Client panels used to call auth.getUser(), which asks Supabase Auth (Ohio)
 * every time, and supabase-js runs those calls one after another behind a
 * single lock. Measured 10-04: 4–5 getUser per dashboard screen, ~160 ms each,
 * in series — no panel read (apply mode, submit mode, checklist, affiliate tab)
 * left the browser before 0.65–0.85 s.
 *
 * Nothing is lost by not asking: the server layout already verified the user
 * with getUser() on this very render (lib/supabase/gate.ts), and every read or
 * write these components make goes through RLS under the session's own token.
 * A revoked session gets nothing from the database either way. getSession()
 * still refreshes an expiring token, and returns no user once that fails.
 */
export async function sessionUser(): Promise<User | null> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.user ?? null;
}
