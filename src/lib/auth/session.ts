import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { LOCK_AFTER_MS, PING_EVERY_MS } from "@/lib/auth/app-lock";
import { SESSION_COOKIE } from "@/lib/auth/routes";
import { prisma } from "@/lib/prisma";

export { SESSION_COOKIE };

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
/** Sessions used within their last 15 days are pushed out another 30. */
const RENEW_WITHIN_MS = 15 * DAY_MS;
/** Activity is recorded at most once a minute, not on every request. */
const TOUCH_EVERY_MS = PING_EVERY_MS;

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Passkeys turn on the app lock. */
  hasPasskeys: boolean;
};

export type CurrentSession = {
  id: string;
  locked: boolean;
  user: SessionUser;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function writeCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  await writeCookie(token, expiresAt);
}

export async function getSession(): Promise<CurrentSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      lastActiveAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          _count: { select: { passkeys: true } },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const now = Date.now();

  if (session.expiresAt.getTime() <= now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  const { _count, ...profile } = session.user;
  const user = { ...profile, hasPasskeys: _count.passkeys > 0 };
  const idleMs = now - session.lastActiveAt.getTime();
  const locked = user.hasPasskeys && idleMs > LOCK_AFTER_MS;
  const renew = session.expiresAt.getTime() - now < RENEW_WITHIN_MS;
  // A locked session records nothing: only unlocking makes it active again.
  const touch = !locked && idleMs > TOUCH_EVERY_MS;

  if (renew || touch) {
    const expiresAt = renew ? new Date(now + SESSION_TTL_MS) : undefined;
    await prisma.session.update({
      where: { id: session.id },
      data: {
        expiresAt,
        lastActiveAt: touch ? new Date(now) : undefined,
      },
    });

    if (expiresAt) {
      // Cookies can only be written from Server Actions and Route Handlers;
      // during a render the database renewal alone keeps the session alive.
      await writeCookie(token, expiresAt).catch(() => {});
    }
  }

  return { id: session.id, locked, user };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return (await getSession())?.user ?? null;
}

export async function unlockSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(SESSION_COOKIE);
}
