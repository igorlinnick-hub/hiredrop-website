import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * "Is this person signed in?" — with the third answer kept separate.
 *
 * Every dashboard route used to read `const { user, error } = await getUser()`
 * and bounce to /login whenever `error || !user`. That folds two very different
 * situations into one: the person is signed out, and WE COULD NOT ASK. The
 * second one happens on a network blip or a 5xx from the auth service — and
 * Igor hit it coming back from the Stripe tab (09-24): cookies intact, session
 * alive, and the app still threw him at the login screen.
 *
 * `signedOut` → send them to /login (they really have no session).
 * `unreachable` → the session may well be fine; say so and offer a retry,
 *                 never a login screen that implies they were logged out.
 */
export type Gate =
  | { user: User; unreachable?: false; signedOut?: false }
  | { user: null; unreachable: true; signedOut?: false }
  | { user: null; unreachable?: false; signedOut: true };

export async function gateUser(): Promise<Gate> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (user) return { user };

  // status 0 / undefined = the request never got an answer (DNS, offline,
  // TLS, timeout); >= 500 = the service answered, badly. Both are "ask again
  // later", not "you are logged out". Supabase names the first one for us.
  const unreachable =
    !!error &&
    (error.name === "AuthRetryableFetchError" ||
      error.status === undefined ||
      error.status === 0 ||
      error.status >= 500);

  return unreachable ? { user: null, unreachable: true } : { user: null, signedOut: true };
}
