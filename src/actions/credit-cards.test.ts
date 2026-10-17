import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnectedAccounts: vi.fn(),
  fetchItem: vi.fn(),
  fetchCreditCardBills: vi.fn(),
  fetchAllTransactions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/pluggy", () => ({
  getConnectedAccounts: mocks.getConnectedAccounts,
}));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({
    fetchItem: mocks.fetchItem,
    fetchCreditCardBills: mocks.fetchCreditCardBills,
    fetchAllTransactions: mocks.fetchAllTransactions,
  }),
}));

import { getCreditCards } from "./credit-cards";

describe("credit card action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllTransactions.mockResolvedValue([]);
    // The action reads "today" to hide bills already due; pin it so the
    // fixtures' 2026-09-02 due date stays open.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
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
    mocks.fetchCreditCardBills.mockResolvedValue({
      page: 1,
      total: 1,
      totalPages: 1,
      results: [
        {
          id: "bill-inter-2026-08",
          dueDate: new Date("2026-09-02T00:00:00.000Z"),
          billClosingDate: new Date("2026-08-25T00:00:00.000Z"),
          totalAmount: 1340.67,
          totalAmountCurrencyCode: "BRL",
          minimumPaymentAmount: 134.07,
          allowsInstallments: true,
          financeCharges: [],
          payments: [],
          createdAt: new Date("2026-08-26T00:00:00.000Z"),
          updatedAt: new Date("2026-08-26T00:00:00.000Z"),
        },
      ],
    });
    mocks.fetchAllTransactions.mockResolvedValue([
      {
        id: "transaction-next-bill",
        date: new Date("2026-08-26T03:00:00.000Z"),
        type: "DEBIT",
        amount: 245,
        creditCardMetadata: null,
      },
    ]);

    await expect(getCreditCards()).resolves.toEqual({
      cards: [
        expect.objectContaining({
          id: "credit-card",
          bankName: "Inter",
          bankLogoPath: "/assets/banks/inter.svg",
          lastFourDigits: "8896",
          openBalanceAmount: 1169.94,
          openDueDate: "2026-09-02T00:00:00.000Z",
          latestClosedBill: {
            id: "bill-inter-2026-08",
            amount: 1340.67,
            closingDate: "2026-08-25T00:00:00.000Z",
            dueDate: "2026-09-02T00:00:00.000Z",
          },
          nextBillInProgress: {
            amount: 245,
            transactionCount: 1,
            closingDate: "2026-09-25T00:00:00.000Z",
            dueDate: "2026-10-02T00:00:00.000Z",
          },
          creditLimit: 1405.05,
          usedAmount: 1169.94,
          availableAmount: 235.11,
        }),
      ],
      totalOpenBalance: 1169.94,
      error: null,
    });

    expect(mocks.fetchItem).toHaveBeenCalledWith("item-inter");
    expect(mocks.fetchCreditCardBills).toHaveBeenCalledWith("credit-card", {
      pageSize: 500,
    });
    expect(mocks.fetchAllTransactions).toHaveBeenCalledWith("credit-card");
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
      totalOpenBalance: 0,
      error: null,
    });
    expect(mocks.fetchItem).not.toHaveBeenCalled();
  });

  it("keeps the open balance and marks the bill history when bills are unavailable", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
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
    mocks.fetchCreditCardBills.mockRejectedValue(new Error("not available"));

    await expect(getCreditCards()).resolves.toMatchObject({
      cards: [
        expect.objectContaining({
          openBalanceAmount: 1169.94,
          latestClosedBill: null,
          billError: "Histórico de faturas não disponível para este cartão.",
        }),
      ],
      totalOpenBalance: 1169.94,
      error: null,
    });
  });
});
