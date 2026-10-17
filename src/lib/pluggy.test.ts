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

import {
  clearPluggyCache,
  getPluggyClient,
  getPluggyCredentials,
} from "./pluggy";

beforeEach(() => {
  vi.clearAllMocks();
  clearPluggyCache();
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

describe("Pluggy read cache", () => {
  beforeEach(() => {
    mocks.prisma.appSettings.findUnique.mockResolvedValue({
      pluggyClientId: "client-id-for-tests",
      pluggyClientSecret: "client-secret-for-tests",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses the same client, and its API key, across requests", async () => {
    const first = await getPluggyClient();
    const second = await getPluggyClient();

    expect(second).toBe(first);
  });

  it("serves repeated reads from the cache until it is cleared", async () => {
    const fetchAccounts = vi
      .spyOn(PluggyClient.prototype, "fetchAccounts")
      .mockResolvedValue({ results: [] } as never);
    const client = await getPluggyClient();

    await client.fetchAccounts("item-a");
    await client.fetchAccounts("item-a");
    await client.fetchAccounts("item-b");
    expect(fetchAccounts).toHaveBeenCalledTimes(2);

    clearPluggyCache();
    await (await getPluggyClient()).fetchAccounts("item-a");
    expect(fetchAccounts).toHaveBeenCalledTimes(3);
  });

  it("can skip the cache for reads that must be fresh", async () => {
    const fetchItem = vi
      .spyOn(PluggyClient.prototype, "fetchItem")
      .mockResolvedValue({ id: "item-a" } as never);

    await (await getPluggyClient()).fetchItem("item-a");
    await (await getPluggyClient({ fresh: true })).fetchItem("item-a");

    expect(fetchItem).toHaveBeenCalledTimes(2);
  });
});
