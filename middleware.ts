import { type NextRequest } from "next/server";
import { PATHNAME_HEADER, updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // A layout cannot read the pathname, and the dashboard's onboarding gate
  // needs it: the affiliate screen is exempt from the quiz. Forwarding it as a
  // request header is the documented way (next-response.md, "forward headers
  // upstream") — it reaches the server components, never the browser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return await updateSession(request, requestHeaders);
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup"],
};
