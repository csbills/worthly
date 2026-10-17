import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    pluggyItem: {
      findMany: vi.fn(),
    },
  },
  fetchAccounts: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({ fetchAccounts: mocks.fetchAccounts }),
}));

import { getConnectedAccounts } from "./pluggy";

describe("Pluggy account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty result without calling Pluggy when no item is saved", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([]);

    await expect(getConnectedAccounts()).resolves.toEqual({
      itemCount: 0,
      accounts: [],
      error: null,
    });

    expect(mocks.fetchAccounts).not.toHaveBeenCalled();
  });

  it("aggregates accounts from every saved item", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([
      { itemId: "pluggy-item-a" },
      { itemId: "pluggy-item-b" },
    ]);
    mocks.fetchAccounts
      .mockResolvedValueOnce({
        results: [
          {
            id: "account-a",
            itemId: "pluggy-item-a",
            type: "BANK",
            subtype: "CHECKING_ACCOUNT",
            number: "0001/1234",
            balance: 1250.5,
            name: "Conta corrente",
            marketingName: "Conta principal",
            currencyCode: "BRL",
            creditData: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            id: "account-b",
            itemId: "pluggy-item-b",
            type: "CREDIT",
            subtype: "CREDIT_CARD",
            number: "****5678",
            balance: -300,
            name: "Cartão",
            marketingName: null,
            currencyCode: "BRL",
            creditData: null,
          },
        ],
      });

    await expect(getConnectedAccounts()).resolves.toEqual({
      itemCount: 2,
      accounts: [
        {
          id: "account-a",
          itemId: "pluggy-item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001/1234",
          balance: 1250.5,
          name: "Conta corrente",
          marketingName: "Conta principal",
          currencyCode: "BRL",
          creditData: null,
        },
        {
          id: "account-b",
          itemId: "pluggy-item-b",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          number: "****5678",
          balance: -300,
          name: "Cartão",
          marketingName: null,
          currencyCode: "BRL",
          creditData: null,
        },
      ],
      error: null,
    });

    expect(mocks.fetchAccounts).toHaveBeenNthCalledWith(1, "pluggy-item-a");
    expect(mocks.fetchAccounts).toHaveBeenNthCalledWith(2, "pluggy-item-b");
  });
});
