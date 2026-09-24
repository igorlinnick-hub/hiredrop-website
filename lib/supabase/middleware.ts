import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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
  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.includes(request.nextUrl.pathname);

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
