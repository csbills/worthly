import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSpendingPace: vi.fn(),
  getPortfolio: vi.fn(),
  prisma: {
    netWorthSnapshot: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("./overview", () => ({
  getSpendingPace: mocks.getSpendingPace,
}));
vi.mock("./portfolio", () => ({
  getPortfolio: mocks.getPortfolio,
}));
vi.mock("../lib/prisma", () => ({ prisma: mocks.prisma }));

import { getDashboardOverview } from "./dashboard";

describe("Dashboard overview action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:00:00-03:00"));
    vi.clearAllMocks();
    mocks.prisma.netWorthSnapshot.upsert.mockResolvedValue({});
    mocks.prisma.netWorthSnapshot.findMany.mockResolvedValue([
      { snapshotDate: "2026-09-01", netWorth: 8159.33 },
      { snapshotDate: "2026-08-31", netWorth: 7900 },
    ]);
    mocks.getSpendingPace.mockResolvedValue({
      currentMonth: {
        key: "2026-09",
        label: "setembro de 2026",
        total: 0,
        daysInMonth: 30,
        elapsedDays: 1,
      },
      previousMonth: {
        key: "2026-08",
        label: "agosto de 2026",
        total: 0,
        daysInMonth: 31,
      },
      cashFlow: {
        current: {
          receipts: 0,
          expenses: 0,
          balance: 0,
          savingsRate: null,
          estimatedInvestmentCapacity: 0,
        },
        previous: {
          receipts: 0,
          expenses: 0,
          balance: 0,
          savingsRate: null,
          estimatedInvestmentCapacity: 0,
        },
      },
      overviewBalances: {
        accounts: [],
        totalAccountBalance: 3000,
        totalAccountCount: 2,
        accountCurrencyCode: "BRL",
        cards: [],
        totalAvailableCredit: 64.38,
        totalCreditLimit: 1405.05,
        creditCurrencyCode: "BRL",
      },
      accountCount: 2,
      points: [],
      error: null,
    });
    mocks.getPortfolio.mockResolvedValue({
      itemCount: 1,
      manualAssetCount: 0,
      manualCryptoAssetCount: 0,
      manualMarketAssetCount: 0,
      currencies: [
        {
          currencyCode: "BRL",
          assetCount: 2,
          lots: 2,
          balance: 6500,
          amountOriginal: 6200,
          amountProfit: 300,
          categories: [],
          assets: [],
          history: [],
        },
      ],
      error: null,
    });
  });

  it("combines balances, investments, and used credit into a daily net worth snapshot", async () => {
    await expect(getDashboardOverview()).resolves.toMatchObject({
      netWorth: {
        currencyCode: "BRL",
        current: {
          accountBalance: 3000,
          investmentBalance: 6500,
          creditUsed: 1340.67,
          netWorth: 8159.33,
        },
        history: [
          { date: "2026-08-31", netWorth: 7900 },
          { date: "2026-09-01", netWorth: 8159.33 },
        ],
        error: null,
      },
    });

    expect(mocks.prisma.netWorthSnapshot.upsert).toHaveBeenCalledWith({
      where: { snapshotDate: "2026-09-01" },
      create: {
        snapshotDate: "2026-09-01",
        currencyCode: "BRL",
        accountBalance: 3000,
        investmentBalance: 6500,
        creditUsed: 1340.67,
        netWorth: 8159.33,
      },
      update: {
        capturedAt: expect.any(Date),
        currencyCode: "BRL",
        accountBalance: 3000,
        investmentBalance: 6500,
        creditUsed: 1340.67,
        netWorth: 8159.33,
      },
    });
  });
});
