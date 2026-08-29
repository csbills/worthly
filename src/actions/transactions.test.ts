import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnectedAccounts: vi.fn(),
  fetchAllTransactions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/pluggy", () => ({
  getConnectedAccounts: mocks.getConnectedAccounts,
}));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({
    fetchAllTransactions: mocks.fetchAllTransactions,
  }),
}));

import { getCurrentMonthTransactions } from "./transactions";

describe("Current month transaction action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T15:00:00-03:00"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches all pages and keeps only transactions from the current month in São Paulo time", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001/1234",
          balance: 1250.5,
          name: "Conta corrente",
          marketingName: "Conta principal",
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchAllTransactions.mockResolvedValue([
      {
        id: "transaction-in-month",
        accountId: "account-a",
        date: new Date("2026-08-05T12:00:00.000Z"),
        description: "Compra no mercado",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 100,
        balance: 1150.5,
        currencyCode: "BRL",
        category: "Supermercado",
        status: "POSTED",
      },
      {
        id: "transaction-at-local-month-end",
        accountId: "account-a",
        date: new Date("2026-09-01T02:30:00.000Z"),
        description: "Pagamento no fim do mês",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 50,
        balance: 1100.5,
        currencyCode: "BRL",
        category: null,
        status: "POSTED",
      },
      {
        id: "transaction-next-month",
        accountId: "account-a",
        date: new Date("2026-09-01T03:00:00.000Z"),
        description: "Compra do próximo mês",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 25,
        balance: 1075.5,
        currencyCode: "BRL",
        category: null,
        status: "POSTED",
      },
    ]);

    await expect(getCurrentMonthTransactions()).resolves.toEqual({
      month: { key: "2026-08", label: "agosto de 2026" },
      accountCount: 1,
      transactions: [
        {
          id: "transaction-at-local-month-end",
          accountId: "account-a",
          date: "2026-09-01T02:30:00.000Z",
          description: "Pagamento no fim do mês",
          type: "DEBIT",
          amount: 50,
          balance: 1100.5,
          currencyCode: "BRL",
          category: null,
          status: "POSTED",
          accountName: "Conta principal",
          accountNumber: "0001/1234",
        },
        {
          id: "transaction-in-month",
          accountId: "account-a",
          date: "2026-08-05T12:00:00.000Z",
          description: "Compra no mercado",
          type: "DEBIT",
          amount: 100,
          balance: 1150.5,
          currencyCode: "BRL",
          category: "Supermercado",
          status: "POSTED",
          accountName: "Conta principal",
          accountNumber: "0001/1234",
        },
      ],
      error: null,
    });

    expect(mocks.fetchAllTransactions).toHaveBeenCalledWith("account-a", {
      dateFrom: "2026-08-01",
      dateTo: "2026-09-01",
    });
  });

  it("returns an empty result without calling Pluggy when there are no accounts", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 0,
      error: null,
      accounts: [],
    });

    await expect(getCurrentMonthTransactions()).resolves.toMatchObject({
      month: { key: "2026-08", label: "agosto de 2026" },
      accountCount: 0,
      transactions: [],
      error: null,
    });

    expect(mocks.fetchAllTransactions).not.toHaveBeenCalled();
  });
});
