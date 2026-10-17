import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

// The global test setup replaces the DAL with a signed-in stub; this file
// checks the real one.
vi.unmock("@/lib/auth/dal");
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { verifySession } from "./dal";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifySession", () => {
  it("sends requests without a valid session to the login", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    await expect(verifySession()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the signed-in user", async () => {
    const user = { id: "u1", firstName: "Ana", lastName: "S", email: "a@b.co" };
    mocks.getSessionUser.mockResolvedValue(user);

    await expect(verifySession()).resolves.toEqual(user);
  });
});
