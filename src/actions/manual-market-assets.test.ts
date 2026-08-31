import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    manualMarketAsset: {
      findMany: vi.fn(),
    },
  },
  yahooFinance: {
    fetchYahooMarketData: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/yahoo-finance", () => mocks.yahooFinance);
vi.mock("@/lib/market-assets", async () => import("../lib/market-assets"));
vi.mock("@/lib/crypto-market", async () => import("../lib/crypto-market"));
vi.mock("@/lib/crypto-orders", async () => import("../lib/crypto-orders"));

import { getManualMarketAssets } from "./manual-market-assets";

describe("Manual market asset action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.yahooFinance.fetchYahooMarketData.mockResolvedValue({
      PETR4: {
        price: {
          price: 30,
          updatedAt: "2026-08-31T18:00:00.000Z",
        },
        history: [[1_756_560_000_000, 29]],
      },
    });
  });

  it("calculates the stock position and applies live price and history", async () => {
    mocks.prisma.manualMarketAsset.findMany.mockResolvedValue([
      {
        id: "market-petr4",
        symbol: "PETR4",
        name: "Petrobras PN",
        assetType: "STOCK",
        quantity: 49.5,
        averagePrice: 1000 / 49.5,
        currentPrice: null,
        currencyCode: "BRL",
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
        updatedAt: new Date("2026-08-31T12:00:00.000Z"),
        orders: [
          {
            id: "order-petr4",
            side: "BUY",
            orderDate: new Date("2026-08-01T12:00:00.000Z"),
            total: 1000,
            brokerFee: 10,
            unitPrice: 20,
            quantity: 49.5,
            createdAt: new Date("2026-08-01T12:00:00.000Z"),
            updatedAt: new Date("2026-08-01T12:00:00.000Z"),
          },
        ],
      },
    ]);

    await expect(getManualMarketAssets()).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          symbol: "PETR4",
          assetType: "STOCK",
          categoryKey: "EQUITY",
          subtype: "STOCK",
          quantity: 49.5,
          currentPrice: 30,
          balance: 1485,
          amountOriginal: 1000,
          amountProfit: 485,
          amountProfitPercentage: 48.5,
          priceSource: "Yahoo Finance",
          history: [
            {
              date: "2025-08-30T13:20:00.000Z",
              price: 29,
              balance: 1435.5,
            },
          ],
        }),
      ],
      error: null,
    });

    expect(mocks.prisma.manualMarketAsset.findMany).toHaveBeenCalledWith({
      orderBy: [{ assetType: "asc" }, { symbol: "asc" }],
      include: {
        orders: {
          orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    expect(mocks.yahooFinance.fetchYahooMarketData).toHaveBeenCalledWith(
      ["PETR4"],
      90,
    );
  });
});
