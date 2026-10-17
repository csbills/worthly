import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return {
    jar,
    cookieStore: {
      get: vi.fn((name: string) =>
        jar.has(name) ? { name, value: jar.get(name) } : undefined,
      ),
      set: vi.fn((name: string, value: string, _options?: object) => {
        jar.set(name, value);
      }),
      delete: vi.fn((name: string) => {
        jar.delete(name);
      }),
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => mocks.cookieStore,
  headers: async () => new Headers(),
}));

import {
  passkeyName,
  relyingPartyFrom,
  saveChallenge,
  takeChallenge,
} from "./webauthn";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.jar.clear();
});

describe("relyingPartyFrom", () => {
  it("prefers the configured public URL", () => {
    expect(
      relyingPartyFrom({
        appUrl: "https://financas.example.com/",
        host: "10.0.0.5:3000",
        proto: "http",
      }),
    ).toEqual({
      rpID: "financas.example.com",
      origin: "https://financas.example.com",
    });
  });

  it("falls back to the request host", () => {
    expect(relyingPartyFrom({ host: "localhost:3000", proto: null })).toEqual({
      rpID: "localhost",
      origin: "http://localhost:3000",
    });
    expect(
      relyingPartyFrom({ host: "app.example.com", proto: "https" }),
    ).toEqual({ rpID: "app.example.com", origin: "https://app.example.com" });
  });

  it("assumes HTTPS for public hosts without a forwarded protocol", () => {
    expect(relyingPartyFrom({ host: "app.example.com", proto: null })).toEqual({
      rpID: "app.example.com",
      origin: "https://app.example.com",
    });
  });
});

describe("passkeyName", () => {
  it("names the device the passkey was created on", () => {
    expect(
      passkeyName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("iPhone");
    expect(
      passkeyName(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130",
      ),
    ).toBe("Android");
    expect(
      passkeyName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari"),
    ).toBe("Mac");
    expect(passkeyName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "Windows",
    );
    expect(passkeyName(null)).toBe("Navegador");
  });
});

describe("challenges", () => {
  it("hands a saved challenge back once, for the same purpose and user", async () => {
    await saveChallenge("challenge-1", "unlock", "user-1");

    const [, , options] = mocks.cookieStore.set.mock.calls[0];
    expect(options).toMatchObject({ httpOnly: true, sameSite: "strict" });
    expect(mocks.jar.values().next().value).not.toContain("challenge-1");

    await expect(takeChallenge("unlock", "user-1")).resolves.toBe(
      "challenge-1",
    );
    await expect(takeChallenge("unlock", "user-1")).resolves.toBeNull();
  });

  it("refuses a challenge issued for another purpose or user", async () => {
    await saveChallenge("challenge-1", "register", "user-1");
    await expect(takeChallenge("login")).resolves.toBeNull();

    await saveChallenge("challenge-2", "unlock", "user-1");
    await expect(takeChallenge("unlock", "user-2")).resolves.toBeNull();
  });

  it("expires challenges after five minutes", async () => {
    vi.useFakeTimers();
    try {
      await saveChallenge("challenge-1", "login");
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      await expect(takeChallenge("login")).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
