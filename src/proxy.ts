import { type NextRequest, NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/session";

export const config = {
  matcher: ["/((?!(?:login|manifest\\.webmanifest|icon\\.svg)$|_next/static/).*)"],
};

export async function proxy(request: NextRequest) {
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}
