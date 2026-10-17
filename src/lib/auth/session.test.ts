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
  getSessionUser,
  SESSION_COOKIE,
} from "./session";

const DAY = 24 * 60 * 60 * 1000;
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const user = {
  id: "user-1",
  firstName: "Ana",
  lastName: "Souza",
  email: "ana@example.com",
};

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
    mocks.prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 20 * DAY),
      user,
    });

    await expect(getSessionUser()).resolves.toEqual(user);
    expect(mocks.prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: sha256("token-abc") } }),
    );
    expect(mocks.prisma.session.update).not.toHaveBeenCalled();
  });

  it("extends a session that is close to expiring", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 2 * DAY),
      user,
    });

    await getSessionUser();

    const { data } = mocks.prisma.session.update.mock.calls[0][0];
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it("drops expired sessions", async () => {
    mocks.jar.set(SESSION_COOKIE, "token-abc");
    mocks.prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() - 1000),
      user,
    });

    await expect(getSessionUser()).resolves.toBeNull();
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: "session-1" },
    });
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
