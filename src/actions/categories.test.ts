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

import { getCategorySpending } from "./categories";

describe("Category spending action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T15:00:00-03:00"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups current-month expenses by translated top-level and child categories", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Conta A",
          marketingName: "Conta principal",
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchAllTransactions.mockResolvedValue([
      {
        id: "groceries",
        accountId: "account-a",
        date: new Date("2026-08-03T12:00:00.000Z"),
        type: "DEBIT",
        amount: 100,
        category: "Groceries",
        categoryId: "10000000",
      },
      {
        id: "electricity",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 50,
        category: "Electricity",
        categoryId: "17020002",
      },
      {
        id: "water",
        accountId: "account-a",
        date: new Date("2026-08-11T12:00:00.000Z"),
        type: "DEBIT",
        amount: 20,
        category: "Water",
        categoryId: "17020001",
      },
      {
        id: "regular-transfer",
        accountId: "account-a",
        date: new Date("2026-08-12T12:00:00.000Z"),
        type: "DEBIT",
        amount: 30,
        category: "Transfer - PIX",
        categoryId: "05070000",
      },
      {
        id: "uncategorized",
        accountId: "account-a",
        date: new Date("2026-08-13T12:00:00.000Z"),
        type: "DEBIT",
        amount: 25,
        category: null,
        categoryId: null,
      },
      {
        id: "investment",
        accountId: "account-a",
        date: new Date("2026-08-14T12:00:00.000Z"),
        type: "DEBIT",
        amount: 500,
        category: "Investments",
        categoryId: "03000000",
      },
      {
        id: "same-person-transfer",
        accountId: "account-a",
        date: new Date("2026-08-15T12:00:00.000Z"),
        type: "DEBIT",
        amount: 300,
        category: "Same person transfer - PIX",
        categoryId: "04020000",
      },
      {
        id: "income",
        accountId: "account-a",
        date: new Date("2026-08-20T12:00:00.000Z"),
        type: "CREDIT",
        amount: 1000,
        category: "Salary",
        categoryId: "01010000",
      },
    ]);

    const result = await getCategorySpending();

    expect(result).toMatchObject({
      month: {
        key: "2026-08",
        label: "Agosto de 2026",
        previousKey: "2026-07",
        nextKey: "2026-09",
        isCurrent: true,
      },
      total: 225,
      transactionCount: 5,
      accountCount: 1,
      currencyCode: "BRL",
      error: null,
    });
    expect(result.groups.map((group) => group.label)).toEqual([
      "Supermercado",
      "Moradia",
      "Transferências",
      "Outros",
    ]);
    expect(result.groups[1]).toMatchObject({
      key: "17000000",
      label: "Moradia",
      icon: "🏠",
      amount: 70,
      categoryCount: 2,
      categories: [
        {
          id: "17020002",
          label: "Eletricidade",
          amount: 50,
          transactionCount: 1,
        },
        {
          id: "17020001",
          label: "Água",
          amount: 20,
          transactionCount: 1,
        },
      ],
    });
    expect(result.groups[0].percentage).toBeCloseTo(44.444, 2);
    expect(result.groups[1].categories[0].percentage).toBeCloseTo(71.428, 2);
    expect(mocks.fetchAllTransactions).toHaveBeenCalledWith("account-a", {
      dateFrom: "2026-08-01",
      dateTo: "2026-09-01",
    });
  });

  it("excludes mirrored transfers between connected accounts from category spending", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 2,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Conta A",
          marketingName: "Conta principal",
          currencyCode: "BRL",
        },
        {
          id: "account-b",
          itemId: "item-b",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0002",
          balance: 1000,
          name: "Conta B",
          marketingName: "Conta secundária",
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchAllTransactions.mockImplementation(async (accountId: string) => {
      if (accountId === "account-a") {
        return [
          {
            id: "regular-expense",
            accountId,
            date: new Date("2026-08-10T12:00:00.000Z"),
            type: "DEBIT",
            amount: 50,
            category: "Groceries",
            categoryId: "10000000",
          },
          {
            id: "internal-debit",
            accountId,
            date: new Date("2026-08-10T13:00:00.000Z"),
            type: "DEBIT",
            amount: 300,
            category: "Transfer - PIX",
            categoryId: "05070000",
          },
        ];
      }

      return [
        {
          id: "internal-credit",
          accountId,
          date: new Date("2026-08-10T13:00:00.000Z"),
          type: "CREDIT",
          amount: 300,
          category: "Transfers",
          categoryId: "05000000",
        },
      ];
    });

    const result = await getCategorySpending();

    expect(result.total).toBe(50);
    expect(result.transactionCount).toBe(1);
    expect(result.groups).toMatchObject([
      {
        key: "10000000",
        label: "Supermercado",
        icon: "🛒",
        amount: 50,
      },
    ]);
  });

  it("excludes a credit card settlement without excluding card purchases", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "credit-card-a",
          itemId: "item-a",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          number: "0001",
          balance: 1000,
          name: "Cartão",
          marketingName: "Cartão principal",
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchAllTransactions.mockResolvedValue([
      {
        id: "card-settlement",
        accountId: "credit-card-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 120,
        category: "Credit card payment",
        categoryId: "05100000",
      },
      {
        id: "card-purchase",
        accountId: "credit-card-a",
        date: new Date("2026-08-10T13:00:00.000Z"),
        type: "DEBIT",
        amount: 80,
        category: "Shopping",
        categoryId: "08000000",
      },
    ]);

    const result = await getCategorySpending();

    expect(result.total).toBe(80);
    expect(result.transactionCount).toBe(1);
    expect(result.groups).toMatchObject([
      {
        key: "08000000",
        label: "Compras",
        amount: 80,
      },
    ]);
  });

  it("loads a requested previous month and does not allow a future month", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Conta A",
          marketingName: "Conta principal",
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchAllTransactions.mockResolvedValue([]);

    await expect(getCategorySpending("2026-07")).resolves.toMatchObject({
      month: {
        key: "2026-07",
        label: "Julho de 2026",
        previousKey: "2026-06",
        nextKey: "2026-08",
        isCurrent: false,
      },
    });
    expect(mocks.fetchAllTransactions).toHaveBeenNthCalledWith(1, "account-a", {
      dateFrom: "2026-07-01",
      dateTo: "2026-08-01",
    });

    await expect(getCategorySpending("2026-09")).resolves.toMatchObject({
      month: {
        key: "2026-08",
        label: "Agosto de 2026",
        isCurrent: true,
      },
    });
  });
});
