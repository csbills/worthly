import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnectedAccounts: vi.fn(),
  fetchItem: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/pluggy", () => ({
  getConnectedAccounts: mocks.getConnectedAccounts,
}));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({ fetchItem: mocks.fetchItem }),
}));

import { getCreditCards } from "./credit-cards";

describe("credit card action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters credit accounts and resolves the bank from the Pluggy item", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "bank-account",
          itemId: "item-inter",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Conta corrente",
          marketingName: null,
          currencyCode: "BRL",
          creditData: null,
        },
        {
          id: "credit-card",
          itemId: "item-inter",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          number: "8896",
          balance: 1169.94,
          name: "GOLD",
          marketingName: null,
          currencyCode: "BRL",
          creditData: {
            level: "GOLD",
            brand: "MASTERCARD",
            balanceDueDate: new Date("2026-09-02T00:00:00.000Z"),
            availableCreditLimit: 235.11,
            creditLimit: 1405.05,
            status: "ACTIVE",
          },
        },
      ],
    });
    mocks.fetchItem.mockResolvedValue({ connector: { name: "BANCO INTER" } });

    await expect(getCreditCards()).resolves.toEqual({
      cards: [
        expect.objectContaining({
          id: "credit-card",
          bankName: "Inter",
          bankLogoPath: "/assets/banks/inter.svg",
          lastFourDigits: "8896",
          statementAmount: 1169.94,
          dueDate: "2026-09-02T00:00:00.000Z",
          creditLimit: 1405.05,
          usedAmount: 1169.94,
          availableAmount: 235.11,
        }),
      ],
      totalStatementAmount: 1169.94,
      error: null,
    });

    expect(mocks.fetchItem).toHaveBeenCalledWith("item-inter");
  });

  it("returns an empty result when no credit account is connected", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "bank-account",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Conta corrente",
          marketingName: null,
          currencyCode: "BRL",
          creditData: null,
        },
      ],
    });

    await expect(getCreditCards()).resolves.toEqual({
      cards: [],
      totalStatementAmount: 0,
      error: null,
    });
    expect(mocks.fetchItem).not.toHaveBeenCalled();
  });
});
