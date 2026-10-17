import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    passkey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: { findUnique: vi.fn() },
  },
  webauthn: {
    generateRegistrationOptions: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
  },
  saveChallenge: vi.fn(),
  takeChallenge: vi.fn(),
  verifySession: vi.fn(),
  getCurrentSession: vi.fn(),
  createSession: vi.fn(),
  unlockSession: vi.fn(),
  refresh: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@simplewebauthn/server", () => mocks.webauthn);
vi.mock("@/lib/auth/webauthn", () => ({
  RP_NAME: "Bytewave",
  getRelyingParty: async () => ({
    rpID: "localhost",
    origin: "http://localhost:3000",
  }),
  passkeyName: () => "iPhone",
  saveChallenge: mocks.saveChallenge,
  takeChallenge: mocks.takeChallenge,
}));
vi.mock("@/lib/auth/dal", () => ({
  verifySession: mocks.verifySession,
  getCurrentSession: mocks.getCurrentSession,
}));
vi.mock("@/lib/auth/session", () => ({
  createSession: mocks.createSession,
  unlockSession: mocks.unlockSession,
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "iPhone" }),
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { hashPassword } from "@/lib/auth/password";
import { resetLoginAttempts } from "@/lib/auth/rate-limit";
import {
  deletePasskey,
  getPasskeyLoginOptions,
  getPasskeyRegistrationOptions,
  getUnlockOptions,
  loginWithPasskey,
  pingSession,
  registerPasskey,
  unlockWithPasskey,
  unlockWithPassword,
} from "./passkeys";

const user = {
  id: "user-1",
  firstName: "Ana",
  lastName: "Souza",
  email: "ana@example.com",
  hasPasskeys: true,
};

const storedPasskey = {
  id: "pk-1",
  userId: "user-1",
  credentialId: "cred-1",
  publicKey: new Uint8Array([1, 2, 3]),
  counter: 4,
  transports: "internal,hybrid",
};

const registration = { id: "cred-new" } as RegistrationResponseJSON;
const assertion = { id: "cred-1" } as AuthenticationResponseJSON;

function verifiedAssertion(newCounter = 5) {
  mocks.webauthn.verifyAuthenticationResponse.mockResolvedValue({
    verified: true,
    authenticationInfo: { newCounter },
  });
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetLoginAttempts();
  mocks.verifySession.mockResolvedValue(user);
  mocks.getCurrentSession.mockResolvedValue({
    id: "session-1",
    locked: true,
    user,
  });
  mocks.takeChallenge.mockResolvedValue("challenge-1");
});

describe("getPasskeyRegistrationOptions", () => {
  it("asks for a discoverable, user-verified credential on this device", async () => {
    mocks.prisma.passkey.findMany.mockResolvedValue([
      { credentialId: "cred-1", transports: "internal" },
    ]);
    mocks.webauthn.generateRegistrationOptions.mockResolvedValue({
      challenge: "challenge-1",
    });

    await expect(getPasskeyRegistrationOptions()).resolves.toEqual({
      challenge: "challenge-1",
    });

    const options = mocks.webauthn.generateRegistrationOptions.mock.calls[0][0];
    expect(options).toMatchObject({
      rpID: "localhost",
      userName: "ana@example.com",
      userDisplayName: "Ana Souza",
      attestationType: "none",
      excludeCredentials: [{ id: "cred-1", transports: ["internal"] }],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });
    expect(new TextDecoder().decode(options.userID)).toBe("user-1");
    expect(mocks.saveChallenge).toHaveBeenCalledWith(
      "challenge-1",
      "register",
      "user-1",
    );
  });
});

describe("registerPasskey", () => {
  it("stores the public key of a verified credential", async () => {
    const publicKey = new Uint8Array([9, 8, 7]);
    mocks.webauthn.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-new",
          publicKey,
          counter: 0,
          transports: ["internal", "hybrid"],
        },
        credentialBackedUp: true,
      },
    });

    await expect(registerPasskey(registration)).resolves.toEqual({ ok: true });

    expect(mocks.takeChallenge).toHaveBeenCalledWith("register", "user-1");
    expect(mocks.webauthn.verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: "challenge-1",
        expectedOrigin: "http://localhost:3000",
        expectedRPID: "localhost",
        requireUserVerification: true,
      }),
    );
    expect(mocks.prisma.passkey.create).toHaveBeenCalledWith({
      data: {
        credentialId: "cred-new",
        publicKey,
        counter: 0,
        transports: "internal,hybrid",
        backedUp: true,
        name: "iPhone",
        userId: "user-1",
      },
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("refuses a response without a pending challenge", async () => {
    mocks.takeChallenge.mockResolvedValue(null);

    const result = await registerPasskey(registration);

    expect(result.ok).toBe(false);
    expect(mocks.webauthn.verifyRegistrationResponse).not.toHaveBeenCalled();
    expect(mocks.prisma.passkey.create).not.toHaveBeenCalled();
  });

  it("refuses a response that does not verify", async () => {
    mocks.webauthn.verifyRegistrationResponse.mockRejectedValue(
      new Error("Unexpected registration response origin"),
    );

    const result = await registerPasskey(registration);

    expect(result.ok).toBe(false);
    expect(mocks.prisma.passkey.create).not.toHaveBeenCalled();
  });
});

describe("loginWithPasskey", () => {
  it("issues options for any passkey of this site", async () => {
    mocks.webauthn.generateAuthenticationOptions.mockResolvedValue({
      challenge: "challenge-1",
    });

    await getPasskeyLoginOptions();

    expect(mocks.webauthn.generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: "localhost",
      userVerification: "required",
    });
    expect(mocks.saveChallenge).toHaveBeenCalledWith("challenge-1", "login");
  });

  it("verifies against the stored key, then opens a session", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue(storedPasskey);
    verifiedAssertion(5);

    await expect(loginWithPasskey(assertion)).rejects.toThrow("REDIRECT:/");

    expect(mocks.prisma.passkey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { credentialId: "cred-1" } }),
    );
    expect(mocks.webauthn.verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: "challenge-1",
        requireUserVerification: true,
        credential: {
          id: "cred-1",
          publicKey: storedPasskey.publicKey,
          counter: 4,
          transports: ["internal", "hybrid"],
        },
      }),
    );
    const { where, data } = mocks.prisma.passkey.update.mock.calls[0][0];
    expect(where).toEqual({ id: "pk-1" });
    expect(data.counter).toBe(5);
    expect(data.lastUsedAt).toBeInstanceOf(Date);
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
  });

  it("does not open a session for an unknown credential", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue(null);

    const result = await loginWithPasskey(assertion);

    expect(result.ok).toBe(false);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("does not open a session when the signature fails", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue(storedPasskey);
    mocks.webauthn.verifyAuthenticationResponse.mockRejectedValue(
      new Error("Signature verification failed"),
    );

    const result = await loginWithPasskey(assertion);

    expect(result.ok).toBe(false);
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.prisma.passkey.update).not.toHaveBeenCalled();
  });
});

describe("unlock", () => {
  it("limits the unlock options to the signed-in user's passkeys", async () => {
    mocks.prisma.passkey.findMany.mockResolvedValue([
      { credentialId: "cred-1", transports: "internal" },
    ]);
    mocks.webauthn.generateAuthenticationOptions.mockResolvedValue({
      challenge: "challenge-1",
    });

    await getUnlockOptions();

    expect(mocks.prisma.passkey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(
      mocks.webauthn.generateAuthenticationOptions.mock.calls[0][0],
    ).toMatchObject({
      allowCredentials: [{ id: "cred-1", transports: ["internal"] }],
      userVerification: "required",
    });
    expect(mocks.saveChallenge).toHaveBeenCalledWith(
      "challenge-1",
      "unlock",
      "user-1",
    );
  });

  it("unlocks the session and returns where the user was", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue(storedPasskey);
    verifiedAssertion();

    await expect(unlockWithPasskey(assertion, "/transactions")).rejects.toThrow(
      "REDIRECT:/transactions",
    );

    expect(mocks.takeChallenge).toHaveBeenCalledWith("unlock", "user-1");
    expect(mocks.unlockSession).toHaveBeenCalledWith("session-1");
  });

  it("never redirects outside the app", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue(storedPasskey);
    verifiedAssertion();

    await expect(
      unlockWithPasskey(assertion, "//evil.example"),
    ).rejects.toThrow("REDIRECT:/");
  });

  it("refuses another user's passkey", async () => {
    mocks.prisma.passkey.findUnique.mockResolvedValue({
      ...storedPasskey,
      userId: "user-2",
    });
    verifiedAssertion();

    const result = await unlockWithPasskey(assertion, "/");

    expect(result.ok).toBe(false);
    expect(mocks.unlockSession).not.toHaveBeenCalled();
  });

  it("accepts the account password as a fallback", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      passwordHash: await hashPassword("segura-123"),
    });

    await expect(
      unlockWithPassword(
        { status: "idle" },
        form({ password: "segura-123", next: "/investments" }),
      ),
    ).rejects.toThrow("REDIRECT:/investments");
    expect(mocks.unlockSession).toHaveBeenCalledWith("session-1");
  });

  it("keeps the session locked for a wrong password", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      passwordHash: await hashPassword("segura-123"),
    });

    const result = await unlockWithPassword(
      { status: "idle" },
      form({ password: "errada-123", next: "/" }),
    );

    expect(result.status).toBe("error");
    expect(mocks.unlockSession).not.toHaveBeenCalled();
  });

  it("sends visitors without a session to the login", async () => {
    mocks.getCurrentSession.mockResolvedValue(null);

    await expect(getUnlockOptions()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("pingSession", () => {
  it("reports whether the session is active, locked or gone", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({
      id: "session-1",
      locked: false,
      user,
    });
    await expect(pingSession()).resolves.toBe("active");

    mocks.getCurrentSession.mockResolvedValueOnce({
      id: "session-1",
      locked: true,
      user,
    });
    await expect(pingSession()).resolves.toBe("locked");

    mocks.getCurrentSession.mockResolvedValueOnce(null);
    await expect(pingSession()).resolves.toBe("signed-out");
  });
});

describe("deletePasskey", () => {
  it("only deletes the signed-in user's own passkeys", async () => {
    await deletePasskey("pk-1");

    expect(mocks.prisma.passkey.deleteMany).toHaveBeenCalledWith({
      where: { id: "pk-1", userId: "user-1" },
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
