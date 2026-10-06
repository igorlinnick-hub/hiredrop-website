import { NextResponse, type NextRequest } from "next/server";
import { PATHNAME_HEADER, updateSession } from "@/lib/supabase/middleware";

// The matcher's /onboarding/:path* also catches public/onboarding/* art — step
// photos, and the platform logos the dashboard's launch cards show. Each one
// used to cost a Supabase getUser (signed in) or a 307 to /login (signed out,
// so the photos on the public quiz never loaded). Routes here have no file
// extension; files always do.
const STATIC_FILE = /\.[a-z0-9]+$/i;

export async function middleware(request: NextRequest) {
  if (STATIC_FILE.test(request.nextUrl.pathname)) return NextResponse.next();

  // Every form is method="post" so its fields never land in the URL. Posted
  // before the page's JS loaded (autofill + Enter on a slow phone), it reaches
  // here — and Vercel answers a POST to a prerendered page with a bare 405.
  // Send it back as a GET of the same page: the form again, nothing lost but
  // the keystroke. Server actions carry Next-Action and pass through.
  if (request.method === "POST" && !request.headers.has("next-action")) {
    return NextResponse.redirect(request.nextUrl, 303);
  }

  // Matched only for the POST above — no session work on these pages.
  if (request.nextUrl.pathname.startsWith("/auth/")) return NextResponse.next();

  // A layout cannot read the pathname, and the dashboard's onboarding gate
  // needs it: the affiliate screen is exempt from the quiz. Forwarding it as a
  // request header is the documented way (next-response.md, "forward headers
  // upstream") — it reaches the server components, never the browser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return await updateSession(request, requestHeaders);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    "/signup",
    "/auth/reset-password",
    "/auth/update-password",
  ],
};
