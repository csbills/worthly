import { type NextRequest, NextResponse } from "next/server";

import { getProxyRedirect, SESSION_COOKIE } from "@/lib/auth/routes";

/**
 * Optimistic gate: bounce visitors without a session cookie to the login
 * before rendering anything. Pages and Server Actions still verify the
 * session against the database (src/lib/auth/dal.ts).
 */
export function proxy(request: NextRequest) {
  const target = getProxyRedirect(
    request.nextUrl.pathname,
    request.cookies.has(SESSION_COOKIE),
  );

  if (target) {
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
