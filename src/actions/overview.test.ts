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

import { getSpendingPace } from "./overview";

describe("Spending pace action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T15:00:00-03:00"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consolidates debit transactions by day for the current and previous month", async () => {
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
          balance: 2000,
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
            id: "current-day-1",
            accountId,
            date: new Date("2026-08-01T12:00:00.000Z"),
            type: "DEBIT",
            amount: 100,
          },
          {
            id: "current-day-5",
            accountId,
            date: new Date("2026-08-05T12:00:00.000Z"),
            type: "DEBIT",
            amount: -150,
          },
          {
            id: "current-credit",
            accountId,
            date: new Date("2026-08-06T12:00:00.000Z"),
            type: "CREDIT",
            amount: 900,
          },
          {
            id: "previous-day-1",
            accountId,
            date: new Date("2026-07-01T12:00:00.000Z"),
            type: "DEBIT",
            amount: 80,
          },
          {
            id: "previous-day-15",
            accountId,
            date: new Date("2026-07-15T12:00:00.000Z"),
            type: "DEBIT",
            amount: 40,
          },
        ];
      }

      return [
        {
          id: "current-local-end",
          accountId,
          date: new Date("2026-09-01T02:30:00.000Z"),
          type: "DEBIT",
          amount: 50,
        },
        {
          id: "previous-day-31",
          accountId,
          date: new Date("2026-07-31T12:00:00.000Z"),
          type: "DEBIT",
          amount: 80,
        },
        {
          id: "outside-range",
          accountId,
          date: new Date("2026-09-01T03:00:00.000Z"),
          type: "DEBIT",
          amount: 500,
        },
      ];
    });

    await expect(getSpendingPace()).resolves.toEqual({
      currentMonth: {
        key: "2026-08",
        label: "agosto de 2026",
        total: 250,
        daysInMonth: 31,
        elapsedDays: 29,
      },
      previousMonth: {
        key: "2026-07",
        label: "julho de 2026",
        total: 200,
        daysInMonth: 31,
      },
      accountCount: 2,
      points: [
        { day: 1, current: 100, previous: 80 },
        { day: 2, current: 100, previous: 80 },
        { day: 3, current: 100, previous: 80 },
        { day: 4, current: 100, previous: 80 },
        { day: 5, current: 250, previous: 80 },
        { day: 6, current: 250, previous: 80 },
        { day: 7, current: 250, previous: 80 },
        { day: 8, current: 250, previous: 80 },
        { day: 9, current: 250, previous: 80 },
        { day: 10, current: 250, previous: 80 },
        { day: 11, current: 250, previous: 80 },
        { day: 12, current: 250, previous: 80 },
        { day: 13, current: 250, previous: 80 },
        { day: 14, current: 250, previous: 80 },
        { day: 15, current: 250, previous: 120 },
        { day: 16, current: 250, previous: 120 },
        { day: 17, current: 250, previous: 120 },
        { day: 18, current: 250, previous: 120 },
        { day: 19, current: 250, previous: 120 },
        { day: 20, current: 250, previous: 120 },
        { day: 21, current: 250, previous: 120 },
        { day: 22, current: 250, previous: 120 },
        { day: 23, current: 250, previous: 120 },
        { day: 24, current: 250, previous: 120 },
        { day: 25, current: 250, previous: 120 },
        { day: 26, current: 250, previous: 120 },
        { day: 27, current: 250, previous: 120 },
        { day: 28, current: 250, previous: 120 },
        { day: 29, current: 250, previous: 120 },
        { day: 30, current: null, previous: 120 },
        { day: 31, current: null, previous: 200 },
      ],
      error: null,
    });

    expect(mocks.fetchAllTransactions).toHaveBeenNthCalledWith(1, "account-a", {
      dateFrom: "2026-07-01",
      dateTo: "2026-09-01",
    });
    expect(mocks.fetchAllTransactions).toHaveBeenNthCalledWith(2, "account-b", {
      dateFrom: "2026-07-01",
      dateTo: "2026-09-01",
    });
  });

  it("ignores investments and same-person transfers without ignoring regular transfers", async () => {
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
        id: "regular-expense",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 100,
        category: "Groceries",
        categoryId: "11000000",
        operationType: null,
      },
      {
        id: "regular-transfer",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 75,
        category: "Transfers",
        categoryId: "05000000",
        operationType: "PIX",
      },
      {
        id: "investment",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 500,
        category: "Investments",
        categoryId: "03000000",
        operationType: "APLIC_FINANCEIRA",
      },
      {
        id: "same-person-pix",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 300,
        category: "Same person transfer - PIX",
        categoryId: "04010000",
        operationType: "PIX",
      },
      {
        id: "uncategorized-investment",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        type: "DEBIT",
        amount: 200,
        category: null,
        categoryId: null,
        operationType: "APLIC_FINANCEIRA",
      },
    ]);

    const result = await getSpendingPace();

    expect(result.currentMonth.total).toBe(175);
    expect(result.previousMonth.total).toBe(0);
    expect(result.points[9]).toEqual({
      day: 10,
      current: 175,
      previous: 0,
    });
  });

  it("returns an empty result without calling Pluggy when there are no accounts", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 0,
      error: null,
      accounts: [],
    });

    await expect(getSpendingPace()).resolves.toMatchObject({
      currentMonth: {
        key: "2026-08",
        label: "agosto de 2026",
        total: 0,
        elapsedDays: 29,
      },
      previousMonth: {
        key: "2026-07",
        label: "julho de 2026",
        total: 0,
      },
      accountCount: 0,
      points: [],
      error: null,
    });

    expect(mocks.fetchAllTransactions).not.toHaveBeenCalled();
  });

  it("normalizes the previous month when the current month is January", async () => {
    vi.setSystemTime(new Date("2026-01-15T15:00:00-03:00"));
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

    await expect(getSpendingPace()).resolves.toMatchObject({
      currentMonth: {
        key: "2026-01",
        label: "janeiro de 2026",
        daysInMonth: 31,
        elapsedDays: 15,
      },
      previousMonth: {
        key: "2025-12",
        label: "dezembro de 2025",
        daysInMonth: 31,
      },
    });

    expect(mocks.fetchAllTransactions).toHaveBeenCalledWith("account-a", {
      dateFrom: "2025-12-01",
      dateTo: "2026-02-01",
    });
  });
});
