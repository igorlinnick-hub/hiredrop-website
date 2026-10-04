import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthError } from "@supabase/supabase-js";

/** Set by middleware.ts so server components can see which route is rendering. */
export const PATHNAME_HEADER = "x-hd-pathname";

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  // Rebuilt per call, and the cookie header is re-read from request.cookies
  // every time: Supabase refreshes the session by writing NEW cookies onto the
  // request, and a snapshot taken before that would forward the expired token
  // upstream — logging the user out on exactly the request that renewed them.
  const forward = () => {
    if (!requestHeaders) return NextResponse.next({ request });
    const headers = new Headers(requestHeaders);
    headers.set("cookie", request.cookies.toString());
    return NextResponse.next({ request: { headers } });
  };

  let supabaseResponse = forward();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/\s+/g, ""),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = forward();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Middleware runs on Vercel's edge next to the visitor (pdx1 for Igor), the
  // auth service sits in Ohio: getUser() was a cross-country round trip on every
  // /dashboard and /onboarding request, ~0.25–0.3 s of blank screen before the
  // first byte (10-03). The project signs JWTs with an asymmetric key (ES256),
  // so getClaims() verifies the signature locally against the cached JWKS and
  // still refreshes an expiring session through getSession(). Revocation is
  // not checked here — the dashboard layout and every page re-ask getUser()
  // from the server, next to the database.
  //
  // /login and /signup keep getUser(): their redirect goes TO /dashboard, and a
  // revoked session with a still-valid JWT (signed out everywhere, user deleted)
  // would bounce /login → /dashboard → gate → /login forever.
  const isAuthPage = ["/login", "/signup"].includes(request.nextUrl.pathname);
  const { user, authError } = isAuthPage
    ? await readUser(supabase)
    : await readClaims(supabase);

  // "No session" and "couldn't ask" are different answers, and this used to treat
  // them the same (Igor 09-24: came back from the Stripe tab and landed on /login).
  // A network blip or a 5xx from the auth service made getUser() return no user,
  // and the request was bounced as if the person had signed out — which also
  // costs them the cookie refresh on the next try.
  //
  // Fail OPEN on an unreachable/erroring auth service: let the request through.
  // Nothing is exposed by that — every dashboard page re-checks the session
  // server-side and redirects on its own (see app/dashboard/*/page.tsx) — so the
  // worst case is one page render that immediately redirects itself.
  const authUnreachable =
    !user &&
    !!authError &&
    (authError.name === "AuthRetryableFetchError" ||
      authError.status === undefined ||
      authError.status >= 500);

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = ["/dashboard", "/onboarding"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Only the anomaly is logged — a signed-out visitor hitting /dashboard is
  // routine and would drown the signal.
  if (authUnreachable) {
    console.warn(
      `[auth] auth service unreachable: name=${authError?.name} status=${
        authError?.status ?? "none"
      } path=${request.nextUrl.pathname}`
    );
  }

  if (!user && isProtected && !authUnreachable) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed: coming back from an external tab (Stripe)
    // on an expired token used to dump the user on /login with no way back to the
    // page they were on. LoginForm already honours ?next= when it is a local path.
    const back = request.nextUrl.pathname + request.nextUrl.search;
    url.search = `?next=${encodeURIComponent(back)}`;
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

type AuthRead = { user: object | null; authError: AuthError | null };
type Client = ReturnType<typeof createServerClient>;

async function readUser(supabase: Client): Promise<AuthRead> {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, authError: error };
}

async function readClaims(supabase: Client): Promise<AuthRead> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    return { user: data?.claims ?? null, authError: error };
  } catch {
    // getClaims() rethrows anything that is not an AuthError — an expired or
    // exp-less token in a tampered cookie throws a plain Error. That is a bad
    // token, not an outage: signed out, not a 500 from the middleware.
    return { user: null, authError: null };
  }
}
