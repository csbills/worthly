import { type Transaction, TransactionStatus } from "pluggy-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnectedAccounts: vi.fn(),
  fetchItem: vi.fn(),
  fetchAllTransactions: vi.fn(),
  fetchCreditCardBills: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/pluggy", () => ({
  getConnectedAccounts: mocks.getConnectedAccounts,
}));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({
    fetchItem: mocks.fetchItem,
    fetchAllTransactions: mocks.fetchAllTransactions,
    fetchCreditCardBills: mocks.fetchCreditCardBills,
  }),
}));

import { getInstallments } from "./installments";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "transaction-1",
    accountId: "credit-card",
    date: new Date("2026-08-04T12:00:00.000Z"),
    description: "Mercado Livre",
    descriptionRaw: "MERCADO LIVRE",
    type: "DEBIT",
    amount: 54.95,
    amountInAccountCurrency: 54.95,
    balance: 0,
    currencyCode: "BRL",
    category: "Online shopping",
    categoryId: "08010000",
    status: TransactionStatus.POSTED,
    creditCardMetadata: {
      installmentNumber: 1,
      totalInstallments: 7,
      totalAmount: 0,
      purchaseDate: new Date("2026-02-04T12:00:00.000Z"),
      billId: "bill-1",
      cardNumber: "****1234",
    },
    operationType: null,
    operationTypeAdditionalInfo: null,
    providerId: null,
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
    updatedAt: new Date("2026-08-04T12:00:00.000Z"),
    ...overrides,
  };
}

describe("installments server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchItem.mockResolvedValue({
      connector: { name: "BANCO INTER" },
    });
    mocks.fetchAllTransactions.mockResolvedValue([makeTransaction()]);
    mocks.fetchCreditCardBills.mockResolvedValue({
      results: [
        {
          dueDate: new Date("2026-08-02T00:00:00.000Z"),
          billClosingDate: new Date("2026-07-25T00:00:00.000Z"),
        },
      ],
    });
  });

  it("fetches only credit accounts and returns serializable installment data", async () => {
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
          balance: 54.95,
          name: "GOLD",
          marketingName: null,
          currencyCode: "BRL",
          creditData: null,
        },
      ],
    });

    await expect(getInstallments()).resolves.toMatchObject({
      cardCount: 1,
      installments: [
        expect.objectContaining({
          accountId: "credit-card",
          bankName: "Inter",
          bankLogoPath: "/assets/banks/inter.svg",
          cardNumber: "****1234",
          creditCardBilling: {
            closingDay: 25,
            dueDay: 2,
          },
          firstInstallmentDate: "2026-03-02T00:00:00.000Z",
          totalAmount: 384.65,
          paidAmount: 54.95,
          remainingAmount: 329.7,
        }),
      ],
      summary: expect.objectContaining({
        activeCount: 1,
        totalAmount: 384.65,
        paidAmount: 54.95,
        remainingAmount: 329.7,
      }),
      error: null,
    });

    expect(mocks.fetchAllTransactions).toHaveBeenCalledTimes(1);
    expect(mocks.fetchAllTransactions).toHaveBeenCalledWith("credit-card");
    expect(mocks.fetchCreditCardBills).toHaveBeenCalledWith("credit-card", {
      pageSize: 50,
    });
    expect(mocks.fetchItem).toHaveBeenCalledWith("item-inter");
  });

  it("keeps successful cards when another card transaction request fails", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "credit-card-a",
          itemId: "item-inter",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          number: "8896",
          balance: 54.95,
          name: "GOLD",
          marketingName: null,
          currencyCode: "BRL",
          creditData: null,
        },
        {
          id: "credit-card-b",
          itemId: "item-santander",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          number: "1234",
          balance: 0,
          name: "SX",
          marketingName: null,
          currencyCode: "BRL",
          creditData: null,
        },
      ],
    });
    mocks.fetchAllTransactions
      .mockResolvedValueOnce([makeTransaction({ accountId: "credit-card-a" })])
      .mockRejectedValueOnce(new Error("temporarily unavailable"));

    await expect(getInstallments()).resolves.toMatchObject({
      cardCount: 2,
      installments: [expect.objectContaining({ accountId: "credit-card-a" })],
      error:
        "Não foi possível carregar os parcelamentos de um ou mais cartões.",
    });
  });

  it("returns an empty result without consulting Pluggy when no card is connected", async () => {
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
      ],
    });

    await expect(getInstallments()).resolves.toMatchObject({
      cardCount: 0,
      installments: [],
      summary: expect.objectContaining({
        activeCount: 0,
        totalAmount: 0,
      }),
      error: null,
    });
    expect(mocks.fetchAllTransactions).not.toHaveBeenCalled();
  });
});
