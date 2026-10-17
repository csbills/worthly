import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return {
    jar,
    cookieStore: {
      get: vi.fn((name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
      ),
      set: vi.fn(
        (name: string, value: string, _options?: { expires?: Date }) => {
          jar.set(name, value);
        },
      ),
      delete: vi.fn((name: string) => {
        jar.delete(name);
      }),
    },
    prisma: {
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookieStore }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  createSession,
  deleteSession,
  getSession,
  getSessionUser,
  SESSION_COOKIE,
  unlockSession,
} from "./session";

const DAY = 24 * 60 * 60 * 1000;
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const MINUTE = 60 * 1000;

const user = {
  id: "user-1",
  firstName: "Ana",
  lastName: "Souza",
  email: "ana@example.com",
  hasPasskeys: false,
};

function storedSession({
  expiresIn = 20 * DAY,
  idleFor = 0,
  passkeys = 0,
}: {
  expiresIn?: number;
  idleFor?: number;
  passkeys?: number;
} = {}) {
  const { hasPasskeys: _, ...profile } = user;
  return {
    id: "session-1",
    expiresAt: new Date(Date.now() + expiresIn),
    lastActiveAt: new Date(Date.now() - idleFor),
    user: { ...profile, _count: { passkeys } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.jar.clear();
});

describe("createSession", () => {
  it("stores only a hash of the token and sets an httpOnly cookie", async () => {
    await createSession("user-1");

    const token = mocks.jar.get(SESSION_COOKIE);
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/u);

    const { data } = mocks.prisma.session.create.mock.calls[0][0];
    expect(data.userId).toBe("user-1");
    expect(data.tokenHash).toBe(sha256(token as string));
    expect(data.tokenHash).not.toBe(token);

    const [, , options] = mocks.cookieStore.set.mock.calls[0];
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(options?.expires?.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
  });
});

describe("getSessionUser", () => {
  it("returns null without a cookie and never queries the database", async () => {
    await expect(getSessionUser()).resolves.toBeNull();
    expect(mocks.prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("returns the user of a valid session", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(storedSession());

    await expect(getSessionUser()).resolves.toEqual(user);
    expect(mocks.prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: sha256("token-abc") } }),
    );
    expect(mocks.prisma.session.update).not.toHaveBeenCalled();
  });

  it("extends a session that is close to expiring", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(
      storedSession({ expiresIn: 2 * DAY }),
    );

    await getSessionUser();

    const { data } = mocks.prisma.session.update.mock.calls[0][0];
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it("drops expired sessions", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(
      storedSession({ expiresIn: -1000 }),
    );

    await expect(getSessionUser()).resolves.toBeNull();
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: "session-1" },
    });
  });
});

describe("getSession", () => {
  it("never locks a session when no passkey is set up", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(
      storedSession({ idleFor: 3 * DAY }),
    );

    await expect(getSession()).resolves.toMatchObject({
      id: "session-1",
      locked: false,
      user,
    });
  });

  it("locks a session left idle with passkeys set up, without refreshing it", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(
      storedSession({ idleFor: 6 * MINUTE, passkeys: 1 }),
    );

    await expect(getSession()).resolves.toMatchObject({
      locked: true,
      user: { ...user, hasPasskeys: true },
    });
    // Visiting the unlock screen must not count as activity.
    expect(mocks.prisma.session.update).not.toHaveBeenCalled();
  });

  it("keeps an active session unlocked and records the activity", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(
      storedSession({ idleFor: 2 * MINUTE, passkeys: 1 }),
    );

    await expect(getSession()).resolves.toMatchObject({ locked: false });

    const { data } = mocks.prisma.session.update.mock.calls[0][0];
    expect(data.lastActiveAt.getTime()).toBeGreaterThan(Date.now() - 1000);
    expect(data.expiresAt).toBeUndefined();
  });

  it("does not write on every request", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue(
      storedSession({ idleFor: 10 * 1000, passkeys: 1 }),
    );

    await getSession();

    expect(mocks.prisma.session.update).not.toHaveBeenCalled();
  });
});

describe("unlockSession", () => {
  it("marks the session as active again", async () => {
    await unlockSession("session-1");

    const { where, data } = mocks.prisma.session.update.mock.calls[0][0];
    expect(where).toEqual({ id: "session-1" });
    expect(data.lastActiveAt.getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});

describe("deleteSession", () => {
  it("removes the session row and the cookie", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");

    await deleteSession();

    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: sha256("token-abc") },
    });
    expect(mocks.jar.has(SESSION_COOKIE)).toBe(false);
  });
});
