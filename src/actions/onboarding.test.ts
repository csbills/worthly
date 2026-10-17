import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    appSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    pluggyItem: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  fetchCategories: vi.fn(),
  fetchItem: vi.fn(),
  fetchAccounts: vi.fn(),
  getPluggyCredentials: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/pluggy", () => ({
  createPluggyClient: () => ({ fetchCategories: mocks.fetchCategories }),
  getPluggyClient: async () => ({
    fetchItem: mocks.fetchItem,
    fetchAccounts: mocks.fetchAccounts,
  }),
  getPluggyCredentials: mocks.getPluggyCredentials,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  addPluggyConnection,
  completeOnboarding,
  getOnboardingState,
  removePluggyConnection,
  savePluggyCredentials,
} from "./onboarding";

const ITEM_ID = "0b3c5e6a-1d2f-4a9b-8c7d-6e5f4a3b2c1d";
const idle = { status: "idle" } as const;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("savePluggyCredentials", () => {
  it("requires both the client id and the client secret", async () => {
    const result = await savePluggyCredentials(
      idle,
      form({ clientId: "abc", clientSecret: "  " }),
    );

    expect(result.status).toBe("error");
    expect(mocks.prisma.appSettings.upsert).not.toHaveBeenCalled();
  });

  it("does not store credentials that Pluggy rejects", async () => {
    mocks.fetchCategories.mockRejectedValue(new Error("401 Unauthorized"));

    const result = await savePluggyCredentials(
      idle,
      form({ clientId: "bad-id", clientSecret: "bad-secret" }),
    );

    expect(result).toEqual({
      status: "error",
      message: expect.stringContaining("Pluggy recusou"),
      // The client id is echoed back so the form keeps it; the secret is not.
      fields: { clientId: "bad-id" },
    });
    expect(JSON.stringify(result)).not.toContain("bad-secret");
    expect(mocks.prisma.appSettings.upsert).not.toHaveBeenCalled();
  });

  it("validates against Pluggy and stores the trimmed credentials", async () => {
    mocks.fetchCategories.mockResolvedValue({ results: [] });

    const result = await savePluggyCredentials(
      idle,
      form({ clientId: " my-id ", clientSecret: " my-secret " }),
    );

    expect(result.status).toBe("success");
    expect(mocks.prisma.appSettings.upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: {
        id: "default",
        pluggyClientId: "my-id",
        pluggyClientSecret: "my-secret",
      },
      update: { pluggyClientId: "my-id", pluggyClientSecret: "my-secret" },
    });
  });
});

describe("addPluggyConnection", () => {
  it("rejects values that are not an item id before calling Pluggy", async () => {
    const result = await addPluggyConnection(
      idle,
      form({ itemId: "not-an-item" }),
    );

    expect(result.status).toBe("error");
    expect(mocks.fetchItem).not.toHaveBeenCalled();
  });

  it("explains what to check when Pluggy cannot find the item", async () => {
    mocks.fetchItem.mockRejectedValue(new Error("404"));

    const result = await addPluggyConnection(idle, form({ itemId: ITEM_ID }));

    expect(result).toEqual({
      status: "error",
      message: expect.stringContaining("mesma aplicação"),
      fields: { itemId: ITEM_ID },
    });
    expect(mocks.prisma.pluggyItem.upsert).not.toHaveBeenCalled();
  });

  it("names the connection after the bank behind the MeuPluggy item", async () => {
    mocks.fetchItem.mockResolvedValue({
      id: ITEM_ID,
      status: "UPDATED",
      connector: { name: "MeuPluggy", imageUrl: "https://cdn/meupluggy.svg" },
    });
    mocks.fetchAccounts.mockResolvedValue({
      results: [{ name: "Nu Pagamentos S.A.", marketingName: null }],
    });

    const result = await addPluggyConnection(
      idle,
      form({ itemId: ` ${ITEM_ID.toUpperCase()} ` }),
    );

    const details = {
      connectorName: "Nubank",
      connectorImageUrl: "/assets/banks/nubank.svg",
      status: "UPDATED",
    };
    expect(result).toEqual({
      status: "success",
      message: expect.stringContaining("Nubank"),
    });
    expect(mocks.prisma.pluggyItem.upsert).toHaveBeenCalledWith({
      where: { itemId: ITEM_ID },
      create: { itemId: ITEM_ID, ...details },
      update: details,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("keeps the connector identity when the accounts are not ready yet", async () => {
    mocks.fetchItem.mockResolvedValue({
      id: ITEM_ID,
      status: "UPDATING",
      connector: { name: "Banco XYZ", imageUrl: "https://cdn/xyz.svg" },
    });
    mocks.fetchAccounts.mockRejectedValue(new Error("not ready"));

    await addPluggyConnection(idle, form({ itemId: ITEM_ID }));

    expect(mocks.prisma.pluggyItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          connectorName: "Banco XYZ",
          connectorImageUrl: "https://cdn/xyz.svg",
          status: "UPDATING",
        },
      }),
    );
  });
});

describe("removePluggyConnection", () => {
  it("deletes the connection by item id", async () => {
    await removePluggyConnection(form({ itemId: ITEM_ID }));

    expect(mocks.prisma.pluggyItem.deleteMany).toHaveBeenCalledWith({
      where: { itemId: ITEM_ID },
    });
  });
});

describe("getOnboardingState", () => {
  it("reports the saved credentials without exposing the secret", async () => {
    mocks.getPluggyCredentials.mockResolvedValue({
      clientId: "0b3c5e6a-1d2f-4a9b-8c7d-6e5f4a3b2c1d",
      clientSecret: "super-secret",
    });
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([]);
    mocks.prisma.appSettings.findUnique.mockResolvedValue(null);

    const state = await getOnboardingState();

    expect(state).toEqual({
      credentials: { clientIdHint: "0b3c…2c1d" },
      connections: [],
      completed: false,
    });
    expect(JSON.stringify(state)).not.toContain("super-secret");
  });

  it("fills in the bank name of connections saved before it was tracked", async () => {
    mocks.getPluggyCredentials.mockResolvedValue({
      clientId: "client-id-value",
      clientSecret: "secret",
    });
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([
      {
        itemId: ITEM_ID,
        connectorName: null,
        connectorImageUrl: null,
        status: null,
      },
    ]);
    mocks.prisma.appSettings.findUnique.mockResolvedValue(null);
    mocks.fetchItem.mockResolvedValue({
      id: ITEM_ID,
      status: "UPDATED",
      connector: { name: "MeuPluggy", imageUrl: null },
    });
    mocks.fetchAccounts.mockResolvedValue({
      results: [{ name: "Banco Santander", marketingName: null }],
    });

    const state = await getOnboardingState();

    expect(state.connections).toEqual([
      {
        itemId: ITEM_ID,
        connectorName: "Santander",
        connectorImageUrl: "/assets/banks/santander.svg",
        status: "UPDATED",
      },
    ]);
    expect(mocks.prisma.pluggyItem.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("completeOnboarding", () => {
  it("marks the onboarding as done and opens the dashboard", async () => {
    await expect(completeOnboarding()).rejects.toThrow("REDIRECT:/");

    expect(mocks.prisma.appSettings.upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: { id: "default", onboardingCompletedAt: expect.any(Date) },
      update: { onboardingCompletedAt: expect.any(Date) },
    });
  });
});
