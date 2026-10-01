import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { finishLogin } from "@/lib/auth/finish-login";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Email links (confirm signup, etc.) carry token_hash instead of a PKCE
  // code. verifyOtp works on any device — the PKCE code path only works in
  // the browser that initiated signup, which breaks "sign up on desktop,
  // open the email on your phone".
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
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

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Build the response up front so Supabase can attach Set-Cookie headers to IT,
  // not to a cookies() store that gets discarded on redirect.
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

  const { error } = tokenHash && otpType
    ? await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  return finishLogin({ supabase, user, request, origin, next, otpType, sessionResponse: response });
}
