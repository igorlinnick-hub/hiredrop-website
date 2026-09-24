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
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = ["/dashboard", "/onboarding"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && isProtected) {
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
