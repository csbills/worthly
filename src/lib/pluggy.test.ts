import { PluggyClient } from "pluggy-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    appSettings: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { getPluggyClient, getPluggyCredentials } from "./pluggy";

const originalClientId = process.env.PLUGGY_CLIENT_ID;
const originalClientSecret = process.env.PLUGGY_CLIENT_SECRET;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.PLUGGY_CLIENT_ID;
  delete process.env.PLUGGY_CLIENT_SECRET;
  mocks.prisma.appSettings.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  restoreEnv("PLUGGY_CLIENT_ID", originalClientId);
  restoreEnv("PLUGGY_CLIENT_SECRET", originalClientSecret);
});

describe("getPluggyCredentials", () => {
  it("prefers the credentials saved during onboarding", async () => {
    process.env.PLUGGY_CLIENT_ID = "env-id";
    process.env.PLUGGY_CLIENT_SECRET = "env-secret";
    mocks.prisma.appSettings.findUnique.mockResolvedValue({
      pluggyClientId: "db-id",
      pluggyClientSecret: "db-secret",
    });

    await expect(getPluggyCredentials()).resolves.toEqual({
      clientId: "db-id",
      clientSecret: "db-secret",
      source: "database",
    });
  });

  it("falls back to the environment variables", async () => {
    process.env.PLUGGY_CLIENT_ID = "env-id";
    process.env.PLUGGY_CLIENT_SECRET = "env-secret";

    await expect(getPluggyCredentials()).resolves.toEqual({
      clientId: "env-id",
      clientSecret: "env-secret",
      source: "environment",
    });
  });

  it("ignores half-configured credentials", async () => {
    process.env.PLUGGY_CLIENT_ID = "env-id";
    mocks.prisma.appSettings.findUnique.mockResolvedValue({
      pluggyClientId: "db-id",
      pluggyClientSecret: null,
    });

    await expect(getPluggyCredentials()).resolves.toBeNull();
  });
});

describe("getPluggyClient", () => {
  it("explains how to configure Pluggy when nothing is set", async () => {
    await expect(getPluggyClient()).rejects.toThrow(
      "Pluggy credentials are not configured",
    );
  });

  it("creates a Pluggy client from the resolved credentials", async () => {
    process.env.PLUGGY_CLIENT_ID = "client-id-for-tests";
    process.env.PLUGGY_CLIENT_SECRET = "client-secret-for-tests";

    await expect(getPluggyClient()).resolves.toBeInstanceOf(PluggyClient);
  });
});
