import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth/session", () => ({
  createSession: mocks.createSession,
  deleteSession: mocks.deleteSession,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { hashPassword } from "@/lib/auth/password";
import { resetLoginAttempts } from "@/lib/auth/rate-limit";
import { login, logout, signup } from "./auth";

const idle = { status: "idle" } as const;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const signupValues = {
  firstName: "Ana",
  lastName: "Souza",
  email: "ana@example.com",
  password: "segura-123",
  confirmPassword: "segura-123",
};

beforeEach(() => {
  vi.clearAllMocks();
  resetLoginAttempts();
});

describe("signup", () => {
  it("creates the first account, opens a session and starts the onboarding", async () => {
    mocks.prisma.user.count.mockResolvedValue(0);
    mocks.prisma.user.create.mockResolvedValue({ id: "user-1" });

    await expect(signup(idle, form(signupValues))).rejects.toThrow(
      "REDIRECT:/onboarding",
    );

    const created = mocks.prisma.user.create.mock.calls[0][0].data;
    expect(created).toMatchObject({
      firstName: "Ana",
      lastName: "Souza",
      email: "ana@example.com",
    });
    expect(created.passwordHash).toMatch(/^scrypt\$/u);
    expect(JSON.stringify(created)).not.toContain("segura-123");
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
  });

  it("is closed once an account exists", async () => {
    mocks.prisma.user.count.mockResolvedValue(1);

    await expect(signup(idle, form(signupValues))).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("returns field errors without touching the database", async () => {
    mocks.prisma.user.count.mockResolvedValue(0);

    const result = await signup(
      idle,
      form({ ...signupValues, confirmPassword: "outra-123" }),
    );

    expect(result.status).toBe("error");
    expect(result.errors?.confirmPassword).toBeDefined();
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  it("opens a session for valid credentials", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: await hashPassword("segura-123"),
    });

    await expect(
      login(idle, form({ email: "ANA@example.com", password: "segura-123" })),
    ).rejects.toThrow("REDIRECT:/");

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "ana@example.com" },
      select: { id: true, passwordHash: true },
    });
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      passwordHash: await hashPassword("segura-123"),
    });
    const wrongPassword = await login(
      idle,
      form({ email: "ana@example.com", password: "errada-123" }),
    );

    mocks.prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknownEmail = await login(
      idle,
      form({ email: "bia@example.com", password: "errada-123" }),
    );

    expect(wrongPassword.message).toBe(unknownEmail.message);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("locks the email after repeated failures", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(idle, form({ email: "ana@example.com", password: "x1" }));
    }
    const locked = await login(
      idle,
      form({ email: "ana@example.com", password: "x1" }),
    );

    expect(locked.message).toContain("Muitas tentativas");
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(5);
  });
});

describe("logout", () => {
  it("ends the session and returns to the login", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.deleteSession).toHaveBeenCalled();
  });
});
