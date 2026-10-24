import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/((?!(?:login|signup|manifest\\.webmanifest|icon\\.svg|apple-icon)$|api/auth/|_next/static/|splash/).*)",
  ],
};

/** Sends visitors without a session cookie to the login page. Pages check the session itself. */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}
