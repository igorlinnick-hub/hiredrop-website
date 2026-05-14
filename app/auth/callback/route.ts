import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets non-OAuth flows (e.g. password recovery) route through this
  // handler purely to exchange the code for a session, then land on their
  // own page instead of the default onboarding routing.
  const next = searchParams.get("next");

  // Supabase appends error params when a link is expired or already used.
  const errorDescription = searchParams.get("error_description") || searchParams.get("error");
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Build the response up front so Supabase can attach Set-Cookie headers to IT,
  // not to a cookies() store that gets discarded on redirect.
  let response = NextResponse.redirect(`${origin}/dashboard`);

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  let destination: string;
  // Honour a safe relative `next` (must be a same-origin path) and skip the
  // onboarding routing — password recovery needs to land on update-password.
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    destination = next;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    destination = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
  }

  // Preserve the Set-Cookie headers from the original response on the new redirect.
  const finalResponse = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });
  return finalResponse;
}
