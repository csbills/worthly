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
