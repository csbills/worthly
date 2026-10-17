import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

// The global test setup replaces the DAL with a signed-in stub; this file
// checks the real one.
vi.unmock("@/lib/auth/dal");
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  getSession: mocks.getSession,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { verifySession } from "./dal";

const user = {
  id: "u1",
  firstName: "Ana",
  lastName: "S",
  email: "a@b.co",
  hasPasskeys: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifySession", () => {
  it("sends requests without a valid session to the login", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(verifySession()).rejects.toThrow("REDIRECT:/login");
  });

  it("sends locked sessions to the unlock screen", async () => {
    mocks.getSession.mockResolvedValue({ id: "s1", locked: true, user });

    await expect(verifySession()).rejects.toThrow("REDIRECT:/unlock");
  });

  it("returns the signed-in user", async () => {
    mocks.getSession.mockResolvedValue({ id: "s1", locked: false, user });

    await expect(verifySession()).resolves.toEqual(user);
  });
});
