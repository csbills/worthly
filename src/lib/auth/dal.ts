import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSession, type SessionUser } from "@/lib/auth/session";

/** The request's session, locked or not. Memoized per request. */
export const getCurrentSession = cache(getSession);

/**
 * The real authorization check. Call it first in every page that reads data
 * and in every Server Action — Proxy only looks for a cookie.
 * Memoized per request, so calling it in several places costs one query.
 * A locked session (app lock) gets the unlock screen instead of data.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.locked) {
    redirect("/unlock");
  }

  return session.user;
});

export const getCurrentUser = cache(
  async () => (await getCurrentSession())?.user ?? null,
);
