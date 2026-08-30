import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Fast, edge-safe redirect for protected routes based on cookie
 * presence only — not a validity check (no DB access at the edge).
 * This is a UX optimization (redirect before render, no flash of
 * protected content); the real security boundary is the server-side
 * session/membership check in requireSession()/requireActiveOrganization()
 * (lib/auth/session.ts), which every protected page/layout also calls.
 *
 * Named `proxy.ts` per Next.js 16's rename of the `middleware.ts`
 * convention (the exported function is now `proxy`, not `middleware`).
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/feedback/:path*",
    "/changelog/:path*",
    "/onboarding",
  ],
};
