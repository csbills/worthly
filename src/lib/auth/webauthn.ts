import "server-only";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

export const RP_NAME = "Worthly";

const CHALLENGE_COOKIE = "bw_webauthn";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type ChallengePurpose = "register" | "login" | "unlock";

type RelyingParty = { rpID: string; origin: string };

/**
 * Passkeys are bound to a domain (the RP ID). APP_URL pins it in production;
 * without it the request's own host is used, which is what local development
 * on http://localhost needs.
 */
export function relyingPartyFrom({
  appUrl,
  host,
  proto,
}: {
  appUrl?: string;
  host: string | null;
  proto: string | null;
}): RelyingParty {
  if (appUrl) {
    const url = new URL(appUrl);
    return { rpID: url.hostname, origin: url.origin };
  }

  if (!host) {
    throw new Error("Defina APP_URL para usar chaves de acesso.");
  }

  const hostname = host.replace(/:\d+$/u, "");
  const local = hostname === "localhost" || hostname.endsWith(".localhost");
  const protocol = proto ?? (local ? "http" : "https");

  return { rpID: hostname, origin: `${protocol}://${host}` };
}

export async function getRelyingParty() {
  const list = await headers();

  return relyingPartyFrom({
    appUrl: process.env.APP_URL || undefined,
    host: list.get("x-forwarded-host") ?? list.get("host"),
    proto: list.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? null,
  });
}

/** A readable label for the passkeys list, from the creating browser. */
export function passkeyName(userAgent: string | null) {
  const ua = userAgent ?? "";

  if (/iPhone/u.test(ua)) return "iPhone";
  if (/iPad/u.test(ua)) return "iPad";
  if (/Android/u.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/u.test(ua)) return "Mac";
  if (/Windows/u.test(ua)) return "Windows";
  if (/CrOS/u.test(ua)) return "Chromebook";
  if (/Linux/u.test(ua)) return "Linux";
  return "Navegador";
}

type PendingChallenge = {
  challenge: string;
  purpose: ChallengePurpose;
  userId?: string;
  expiresAt: number;
};

// One process serves one person's instance (see rate-limit.ts), so pending
// challenges live in memory. Kept on globalThis so every route bundle and
// dev reload shares the same map. The browser only holds a random handle.
const globalStore = globalThis as typeof globalThis & {
  worthlyWebAuthnChallenges?: Map<string, PendingChallenge>;
};
globalStore.worthlyWebAuthnChallenges ??= new Map();
const pending = globalStore.worthlyWebAuthnChallenges;

export async function saveChallenge(
  challenge: string,
  purpose: ChallengePurpose,
  userId?: string,
) {
  const now = Date.now();

  for (const [handle, entry] of pending) {
    if (entry.expiresAt <= now) pending.delete(handle);
  }

  const handle = randomBytes(24).toString("base64url");
  pending.set(handle, {
    challenge,
    purpose,
    userId,
    expiresAt: now + CHALLENGE_TTL_MS,
  });

  (await cookies()).set(CHALLENGE_COOKIE, handle, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CHALLENGE_TTL_MS / 1000,
  });
}

/** Returns the pending challenge once; any mismatch or expiry yields null. */
export async function takeChallenge(
  purpose: ChallengePurpose,
  userId?: string,
) {
  const store = await cookies();
  const handle = store.get(CHALLENGE_COOKIE)?.value;

  if (!handle) {
    return null;
  }

  store.delete(CHALLENGE_COOKIE);
  const entry = pending.get(handle);
  pending.delete(handle);

  if (
    !entry ||
    entry.purpose !== purpose ||
    entry.userId !== userId ||
    entry.expiresAt <= Date.now()
  ) {
    return null;
  }

  return entry.challenge;
}
