import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { finishLogin } from "@/lib/auth/finish-login";

/**
 * Second half of Google sign-in on our own page (components/auth/GoogleButton).
 * The browser already holds the session — signInWithIdToken wrote it to
 * cookies — so there is no code to exchange here; this only runs what
 * /auth/callback runs after its exchange: attribution, landing page, the
 * sign-up conversion cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next");

  // Collects any cookies Supabase refreshes while reading the session, so the
  // final redirect carries them.
  const response = NextResponse.redirect(`${origin}/dashboard`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/\s+/g, ""),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  return finishLogin({ supabase, user, request, origin, next, sessionResponse: response });
}
