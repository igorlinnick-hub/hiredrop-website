import { NextRequest, NextResponse } from "next/server";
import { landingAfterAuth } from "@/lib/gate/landing";
import { createServerClient } from "@supabase/ssr";
import { ATTRIBUTION_COOKIE, parseAttributionCookie } from "@/lib/attribution";
import {
  ADS_CONFIGURED,
  ADS_OPTOUT_COOKIE,
  META_BROWSER_ID_COOKIE,
  META_CLICK_ID_COOKIE,
  NEW_SIGNUP_COOKIE,
  NEW_SIGNUP_MAX_AGE_SEC,
  isAdsOptedOut,
  isNewSignupConversion,
  mergeSignupAttribution,
} from "@/lib/adPixels";
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

  // Ad opt-out as THIS request states it: our cookie or Global Privacy Control.
  const adsOptedOut = isAdsOptedOut({
    optoutCookie: request.cookies.get(ADS_OPTOUT_COOKIE)?.value,
    gpc: request.headers.get("sec-gpc"),
  });

  // Persist first-touch attribution (utm/ref/click-id params). Sources, in
  // priority order: signup metadata (email flow) → hd_attribution cookie
  // (Google OAuth flow, where no client code runs before this route). Merged
  // with the ad identity keys (fbp/fbc/ua/ads_optout — lib/adPixels.ts) from
  // this request, and written only if something is there. Guarded by
  // "attribution is null" so an existing user's re-login never rewrites their
  // first touch. Best-effort: an error here must never break the login redirect.
  try {
    const base =
      (user.user_metadata?.attribution as Record<string, unknown> | undefined) ??
      (parseAttributionCookie(request.cookies.get(ATTRIBUTION_COOKIE)?.value) as
        | Record<string, unknown>
        | null);
    const attribution = mergeSignupAttribution(base, {
      fbp: request.cookies.get(META_BROWSER_ID_COOKIE)?.value,
      fbc: request.cookies.get(META_CLICK_ID_COOKIE)?.value,
      userAgent: request.headers.get("user-agent"),
      optedOut: adsOptedOut,
    });
    if (Object.keys(attribution).length > 0) {
      await supabase
        .from("profiles")
        .update({ attribution, attributed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("attribution", null);
    }
  } catch {
    // ignore — attribution is analytics, not auth
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("code")
    .eq("user_id", user.id)
    .maybeSingle();
  // One rule for every way in (lib/gate/landing.ts): a safe relative `next`
  // wins — password recovery needs to land on update-password — then the quiz
  // for a new job seeker, their own page for an affiliate. Affiliate intent
  // rides in user metadata because the confirmation email does not carry
  // redirect_to: the link it sends is /auth/callback?token_hash=…&type=signup
  // and nothing more.
  const destination = landingAfterAuth({
    next,
    onboarded: !!profile?.onboarding_completed,
    isAffiliate: !!affiliate,
    affiliateIntent: user.user_metadata?.affiliate_intent === true,
  });

  // Preserve the Set-Cookie headers from the original response on the new redirect.
  const finalResponse = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  // A brand-new job seeker just confirmed: hand the sign-up conversion to the
  // next page, where <AdPixels/> reports it once as reg_<user id> and deletes
  // this cookie. Not httpOnly on purpose — the browser has to read it. Only
  // when an ad platform is configured and the person has not opted out.
  try {
    if (
      ADS_CONFIGURED &&
      !adsOptedOut &&
      isNewSignupConversion({
        createdAt: user.created_at,
        nowMs: Date.now(),
        isAffiliate: !!affiliate,
        affiliateIntent: user.user_metadata?.affiliate_intent === true,
        next,
        otpType,
      })
    ) {
      finalResponse.cookies.set(NEW_SIGNUP_COOKIE, user.id, {
        maxAge: NEW_SIGNUP_MAX_AGE_SEC,
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: origin.startsWith("https://"),
      });
    }
  } catch {
    // ignore — ad measurement must never break the login redirect
  }
  return finalResponse;
}
