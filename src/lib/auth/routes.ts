export const SESSION_COOKIE = "bw_session";

/** Reachable without a session: the auth screens and what installs the PWA. */
const publicPaths = new Set([
  "/login",
  "/signup",
  "/offline",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.ico",
]);

const publicPrefixes = ["/icon", "/apple-icon", "/assets/"];

export function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

/**
 * The Proxy's optimistic check: it only looks at whether a session cookie is
 * present. The real check — the session row in the database — happens in the
 * data access layer, next to every read and every Server Action.
 */
export function getProxyRedirect(pathname: string, hasSessionCookie: boolean) {
  if (hasSessionCookie || isPublicPath(pathname)) {
    return null;
  }

  return "/login";
}

/**
 * Where to go after unlocking. Only same-app paths are honored, so a crafted
 * `?next=` link cannot bounce the user to another site.
 */
export function safeNextPath(next: string | null | undefined) {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return "/";
  }

  const pathname = next.split(/[?#]/u)[0];
  if (pathname === "/unlock" || isPublicPath(pathname)) {
    return "/";
  }

  return next;
}
