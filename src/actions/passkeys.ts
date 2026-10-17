"use server";

import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentSession, verifySession } from "@/lib/auth/dal";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { safeNextPath } from "@/lib/auth/routes";
import { createSession, unlockSession } from "@/lib/auth/session";
import {
  getRelyingParty,
  passkeyName,
  RP_NAME,
  saveChallenge,
  takeChallenge,
} from "@/lib/auth/webauthn";
import { prisma } from "@/lib/prisma";

export type PasskeyResult = { ok: true } | { ok: false; message: string };

export type UnlockFormState = { status: "idle" | "error"; message?: string };

export type PasskeyListItem = {
  id: string;
  name: string;
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
};

const expired: PasskeyResult = {
  ok: false,
  message: "A confirmação expirou. Tente de novo.",
};
const notVerified: PasskeyResult = {
  ok: false,
  message: "Não foi possível confirmar sua identidade. Tente de novo.",
};

function splitTransports(transports: string) {
  return transports ? transports.split(",") : undefined;
}

async function listCredentials(userId: string) {
  const passkeys = await prisma.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  return passkeys.map((passkey) => ({
    id: passkey.credentialId,
    transports: splitTransports(passkey.transports),
  }));
}

async function signedInSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/**
 * Checks an assertion against the stored public key and records the use.
 * Returns the passkey's owner, or null when anything does not match.
 */
async function verifyAssertion(
  response: AuthenticationResponseJSON,
  challenge: string,
) {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
    select: {
      id: true,
      userId: true,
      credentialId: true,
      publicKey: true,
      counter: true,
      transports: true,
    },
  });

  if (!passkey) {
    return null;
  }

  const rp = await getRelyingParty();
  let newCounter: number;

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: splitTransports(passkey.transports),
      },
    });

    if (!verification.verified) {
      return null;
    }
    newCounter = verification.authenticationInfo.newCounter;
  } catch {
    return null;
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: newCounter, lastUsedAt: new Date() },
  });

  return passkey.userId;
}

export async function listPasskeys(): Promise<PasskeyListItem[]> {
  const user = await verifySession();

  return prisma.passkey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

export async function getPasskeyRegistrationOptions() {
  const user = await verifySession();
  const rp = await getRelyingParty();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpID,
    userName: user.email,
    userDisplayName: `${user.firstName} ${user.lastName}`,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: await listCredentials(user.id),
    // Discoverable, so the login needs no email; verified, so it is Face ID
    // or biometrics (or the device passcode), never just a tap.
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    preferredAuthenticatorType: "localDevice",
  });

  await saveChallenge(options.challenge, "register", user.id);
  return options;
}

export async function registerPasskey(
  response: RegistrationResponseJSON,
): Promise<PasskeyResult> {
  const user = await verifySession();
  const challenge = await takeChallenge("register", user.id);

  if (!challenge) {
    return expired;
  }

  const rp = await getRelyingParty();
  let registrationInfo: Awaited<
    ReturnType<typeof verifyRegistrationResponse>
  >["registrationInfo"];

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
    registrationInfo = verification.registrationInfo;
  } catch {
    return notVerified;
  }

  if (!registrationInfo) {
    return notVerified;
  }

  const { credential, credentialBackedUp } = registrationInfo;
  await prisma.passkey.create({
    data: {
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: (credential.transports ?? []).join(","),
      backedUp: credentialBackedUp,
      name: passkeyName((await headers()).get("user-agent")),
      userId: user.id,
    },
  });

  refresh();
  return { ok: true };
}

export async function deletePasskey(id: string) {
  const user = await verifySession();

  await prisma.passkey.deleteMany({ where: { id, userId: user.id } });
  refresh();
}

export async function getPasskeyLoginOptions() {
  const rp = await getRelyingParty();
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "required",
  });

  await saveChallenge(options.challenge, "login");
  return options;
}

export async function loginWithPasskey(
  response: AuthenticationResponseJSON,
): Promise<PasskeyResult> {
  const challenge = await takeChallenge("login");

  if (!challenge) {
    return expired;
  }

  const userId = await verifyAssertion(response, challenge);

  if (!userId) {
    return {
      ok: false,
      message:
        "Esta chave de acesso não foi reconhecida. Entre com e-mail e senha.",
    };
  }

  await createSession(userId);
  redirect("/");
}

export async function getUnlockOptions() {
  const session = await signedInSession();
  const rp = await getRelyingParty();

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: await listCredentials(session.user.id),
    userVerification: "required",
  });

  await saveChallenge(options.challenge, "unlock", session.user.id);
  return options;
}

export async function unlockWithPasskey(
  response: AuthenticationResponseJSON,
  next: string,
): Promise<PasskeyResult> {
  const session = await signedInSession();
  const challenge = await takeChallenge("unlock", session.user.id);

  if (!challenge) {
    return expired;
  }

  const userId = await verifyAssertion(response, challenge);

  if (userId !== session.user.id) {
    return notVerified;
  }

  await unlockSession(session.id);
  redirect(safeNextPath(next));
}

export async function unlockWithPassword(
  _previous: UnlockFormState,
  formData: FormData,
): Promise<UnlockFormState> {
  const session = await signedInSession();
  const { email } = session.user;
  const password = formData.get("password");
  const next = formData.get("next");

  if (typeof password !== "string" || password.length === 0) {
    return { status: "error", message: "Digite sua senha." };
  }

  if (isLoginLocked(email)) {
    return {
      status: "error",
      message: "Muitas tentativas. Aguarde 15 minutos e tente de novo.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    recordLoginFailure(email);
    return { status: "error", message: "Senha incorreta." };
  }

  clearLoginFailures(email);
  await unlockSession(session.id);
  redirect(safeNextPath(typeof next === "string" ? next : null));
}

/**
 * Called by the open app every minute while it is visible, and when it comes
 * back to the foreground. Being visible counts as activity.
 */
export async function pingSession(): Promise<
  "active" | "locked" | "signed-out"
> {
  const session = await getCurrentSession();

  if (!session) return "signed-out";
  return session.locked ? "locked" : "active";
}
