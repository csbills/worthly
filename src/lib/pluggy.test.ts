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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.appSettings.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPluggyCredentials", () => {
  it("returns the credentials saved during onboarding", async () => {
    mocks.prisma.appSettings.findUnique.mockResolvedValue({
      pluggyClientId: "db-id",
      pluggyClientSecret: "db-secret",
    });

    await expect(getPluggyCredentials()).resolves.toEqual({
      clientId: "db-id",
      clientSecret: "db-secret",
    });
  });

  it("ignores PLUGGY_CLIENT_* environment variables", async () => {
    vi.stubEnv("PLUGGY_CLIENT_ID", "env-id");
    vi.stubEnv("PLUGGY_CLIENT_SECRET", "env-secret");

    await expect(getPluggyCredentials()).resolves.toBeNull();
  });

  it("ignores half-configured credentials", async () => {
    mocks.prisma.appSettings.findUnique.mockResolvedValue({
      pluggyClientId: "db-id",
      pluggyClientSecret: null,
    });

    await expect(getPluggyCredentials()).resolves.toBeNull();
  });
});

describe("getPluggyClient", () => {
  it("explains how to configure Pluggy when nothing is saved", async () => {
    await expect(getPluggyClient()).rejects.toThrow(
      "Pluggy credentials are not configured",
    );
  });

  it("creates a Pluggy client from the saved credentials", async () => {
    mocks.prisma.appSettings.findUnique.mockResolvedValue({
      pluggyClientId: "client-id-for-tests",
      pluggyClientSecret: "client-secret-for-tests",
    });

    await expect(getPluggyClient()).resolves.toBeInstanceOf(PluggyClient);
  });
});
