import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSessionUser, type SessionUser } from "@/lib/auth/session";

/**
 * The real authorization check. Call it first in every page that reads data
 * and in every Server Action — Proxy only looks for a cookie.
 * Memoized per request, so calling it in several places costs one query.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const getCurrentUser = cache(getSessionUser);
