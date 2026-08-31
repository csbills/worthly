import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getInvestments: vi.fn(),
  getManualCryptoAssets: vi.fn(),
  getManualMarketAssets: vi.fn(),
  prisma: {
    portfolioSnapshot: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("./investments", () => ({
  getInvestments: mocks.getInvestments,
}));
vi.mock("./manual-crypto-assets", () => ({
  getManualCryptoAssets: mocks.getManualCryptoAssets,
}));
vi.mock("./manual-market-assets", () => ({
  getManualMarketAssets: mocks.getManualMarketAssets,
}));
vi.mock("../lib/prisma", () => ({ prisma: mocks.prisma }));

import { getPortfolio } from "./portfolio";

describe("Portfolio action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T15:00:00-03:00"));
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(
      async (operations: Promise<unknown>[]) => Promise.all(operations),
    );
    mocks.prisma.portfolioSnapshot.upsert.mockResolvedValue({});
    mocks.prisma.portfolioSnapshot.findMany.mockResolvedValue([]);
    mocks.getInvestments.mockResolvedValue({
      itemCount: 1,
      investments: [
        {
          id: "investment-a",
          itemId: "item-a",
          name: "CDB Banco",
          type: "FIXED_INCOME",
          subtype: "CDB",
          currencyCode: "BRL",
          balance: 1000,
          amountOriginal: 900,
          amountProfit: 100,
          quantity: 1,
          institutionName: "Banco",
          issuer: "Banco",
          positionCount: 1,
          dueDate: null,
        },
      ],
      currencies: [],
      error: null,
    });
    mocks.getManualCryptoAssets.mockResolvedValue({
      assets: [],
      error: null,
    });
    mocks.getManualMarketAssets.mockResolvedValue({
      assets: [],
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists today's consolidated totals and returns the stored history", async () => {
    mocks.prisma.portfolioSnapshot.findMany.mockResolvedValue([
      {
        snapshotDate: "2026-08-30",
        balance: 1000,
        amountOriginal: 900,
        amountProfit: 100,
      },
      {
        snapshotDate: "2026-08-29",
        balance: 950,
        amountOriginal: 900,
        amountProfit: 50,
      },
    ]);

    const result = await getPortfolio();

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.portfolioSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { snapshotDate: "desc" },
        take: 90,
      }),
    );
    expect(mocks.prisma.portfolioSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          snapshotDate_currencyCode: {
            snapshotDate: "2026-08-30",
            currencyCode: "BRL",
          },
        },
        create: expect.objectContaining({
          snapshotDate: "2026-08-30",
          currencyCode: "BRL",
          balance: 1000,
          categories: {
            create: [
              expect.objectContaining({
                categoryKey: "FIXED_INCOME",
                balance: 1000,
                assetCount: 1,
              }),
            ],
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      itemCount: 1,
      manualAssetCount: 0,
      error: null,
      currencies: [
        expect.objectContaining({
          currencyCode: "BRL",
          balance: 1000,
          history: [
            {
              date: "2026-08-29",
              balance: 950,
              amountOriginal: 900,
              amountProfit: 50,
            },
            {
              date: "2026-08-30",
              balance: 1000,
              amountOriginal: 900,
              amountProfit: 100,
            },
          ],
        }),
      ],
    });
  });

  it("does not write a daily snapshot when one source returned an incomplete result", async () => {
    mocks.getInvestments.mockResolvedValue({
      itemCount: 2,
      investments: [],
      currencies: [],
      error: "Uma conexão falhou",
    });

    const result = await getPortfolio();

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(result.error).toBe("Uma conexão falhou");
  });

  it("includes manual market assets in the consolidated portfolio", async () => {
    mocks.getInvestments.mockResolvedValue({
      itemCount: 1,
      investments: [],
      currencies: [],
      error: null,
    });
    mocks.getManualMarketAssets.mockResolvedValue({
      assets: [
        {
          id: "manual-mxrf11",
          symbol: "MXRF11",
          name: "Maxi Renda",
          assetType: "FII",
          categoryKey: "EQUITY",
          subtype: "REAL_ESTATE_FUND",
          quantity: 10,
          averagePrice: 100,
          currentPrice: 110,
          balance: 1100,
          amountOriginal: 1000,
          amountProfit: 100,
          amountProfitPercentage: 10,
          currencyCode: "BRL",
          priceSource: "Yahoo Finance",
          priceUpdatedAt: "2026-08-30T18:00:00.000Z",
          history: [],
          orders: [],
          realizedProfit: 0,
          orderCount: 1,
          updatedAt: "2026-08-30T18:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await getPortfolio();

    expect(result).toMatchObject({
      itemCount: 1,
      manualAssetCount: 1,
      error: null,
      currencies: [
        expect.objectContaining({
          currencyCode: "BRL",
          balance: 1100,
          categories: [
            expect.objectContaining({
              key: "EQUITY",
              balance: 1100,
              assets: [expect.objectContaining({ symbol: "MXRF11" })],
            }),
          ],
        }),
      ],
    });
  });
});
