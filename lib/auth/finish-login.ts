import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { landingAfterAuth } from "@/lib/gate/landing";
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

/**
 * Everything that happens once a request holds a fresh session, whichever
 * door it came through: /auth/callback (email links, redirect OAuth) and
 * /auth/finish (Google sign-in on our own page, components/auth/GoogleButton.tsx).
 * Writes first-touch attribution, picks the landing page, hands a brand-new
 * signup to the ad pixels, and returns the redirect — carrying whatever
 * session cookies Supabase set on `sessionResponse` while getting here.
 */
export async function finishLogin({
  supabase,
  user,
  request,
  origin,
  next,
  otpType = null,
  sessionResponse,
}: {
  supabase: SupabaseClient;
  user: User;
  request: NextRequest;
  origin: string;
  next: string | null;
  otpType?: string | null;
  sessionResponse: NextResponse;
}): Promise<NextResponse> {
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
  sessionResponse.cookies.getAll().forEach((cookie) => {
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
