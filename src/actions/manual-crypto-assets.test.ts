import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    manualCryptoAsset: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  coingecko: {
    fetchCoinGeckoPrices: vi.fn(),
    fetchCoinGeckoMarketChart: vi.fn(),
  },
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/coingecko", () => mocks.coingecko);
vi.mock("@/lib/crypto-assets", () => ({
  findSupportedCryptoAsset: (value: string) => {
    const assets = {
      bitcoin: { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin" },
      ethereum: {
        symbol: "ETH",
        name: "Ethereum",
        coingeckoId: "ethereum",
      },
    } as const;

    return assets[
      value.trim().toLocaleLowerCase("en-US") as keyof typeof assets
    ];
  },
}));
vi.mock("@/lib/crypto-market", () => ({
  calculateCryptoPurchase: ({
    purchaseTotal,
    brokerFee,
    purchasePrice,
  }: {
    purchaseTotal: number;
    brokerFee: number;
    purchasePrice: number;
  }) => {
    const quantity = (purchaseTotal - brokerFee) / purchasePrice;

    return {
      quantity,
      averagePrice: purchaseTotal / quantity,
      amountOriginal: purchaseTotal,
    };
  },
  calculateCryptoPerformance: ({
    quantity,
    averagePrice,
    currentPrice,
  }: {
    quantity: number;
    averagePrice: number | null;
    currentPrice: number | null;
  }) => {
    const balance = currentPrice === null ? null : quantity * currentPrice;
    const amountOriginal =
      averagePrice === null ? null : quantity * averagePrice;
    const amountProfit =
      balance === null || amountOriginal === null
        ? null
        : balance - amountOriginal;

    return {
      balance,
      amountOriginal,
      amountProfit,
      amountProfitPercentage:
        amountProfit === null || amountOriginal === null || amountOriginal <= 0
          ? null
          : (amountProfit / amountOriginal) * 100,
    };
  },
  mapMarketChartToHistory: (
    prices: readonly (readonly [number, number])[],
    quantity: number,
  ) =>
    prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString(),
      price,
      balance: quantity * price,
    })),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  getManualCryptoAssets,
  saveManualCryptoAsset,
} from "./manual-crypto-assets";

describe("Manual crypto asset actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes a position and calculates its current value and profit", async () => {
    mocks.prisma.manualCryptoAsset.findMany.mockResolvedValue([
      {
        id: "crypto-btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.5,
        averagePrice: 100000,
        currentPrice: 120000,
        currencyCode: "BRL",
        coingeckoId: null,
        purchaseTotal: 50000,
        brokerFee: 0,
        purchasePrice: 100000,
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
        updatedAt: new Date("2026-08-29T12:00:00.000Z"),
      },
    ]);

    await expect(getManualCryptoAssets()).resolves.toEqual({
      assets: [
        {
          id: "crypto-btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.5,
          averagePrice: 100000,
          currentPrice: 120000,
          balance: 60000,
          amountOriginal: 50000,
          amountProfit: 10000,
          amountProfitPercentage: 20,
          currencyCode: "BRL",
          coingeckoId: null,
          purchaseTotal: 50000,
          brokerFee: 0,
          purchasePrice: 100000,
          priceSource: "Manual",
          priceUpdatedAt: "2026-08-29T12:00:00.000Z",
          history: [],
          updatedAt: "2026-08-29T12:00:00.000Z",
        },
      ],
      error: null,
    });

    expect(mocks.prisma.manualCryptoAsset.findMany).toHaveBeenCalledWith({
      orderBy: [{ currencyCode: "asc" }, { symbol: "asc" }],
    });
  });

  it("keeps cost basis and profit unavailable when no average price was provided", async () => {
    mocks.prisma.manualCryptoAsset.findMany.mockResolvedValue([
      {
        id: "crypto-eth",
        symbol: "ETH",
        name: "Ethereum",
        quantity: 2,
        averagePrice: null,
        currentPrice: 12000,
        currencyCode: "BRL",
        coingeckoId: null,
        purchaseTotal: null,
        brokerFee: null,
        purchasePrice: null,
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
        updatedAt: new Date("2026-08-29T12:00:00.000Z"),
      },
    ]);

    await expect(getManualCryptoAssets()).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          symbol: "ETH",
          balance: 24000,
          amountOriginal: null,
          amountProfit: null,
        }),
      ],
      error: null,
    });
  });

  it("uses the persisted purchase inputs and includes the broker fee in profit", async () => {
    mocks.prisma.manualCryptoAsset.findMany.mockResolvedValue([
      {
        id: "crypto-eth",
        symbol: "ETH",
        name: "Ethereum",
        quantity: 999,
        averagePrice: 1,
        currentPrice: 12000,
        currencyCode: "BRL",
        coingeckoId: null,
        purchaseTotal: 25100,
        brokerFee: 100,
        purchasePrice: 10000,
        updatedAt: new Date("2026-08-29T12:00:00.000Z"),
      },
    ]);

    await expect(getManualCryptoAssets()).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          quantity: 2.5,
          averagePrice: 10040,
          purchaseTotal: 25100,
          brokerFee: 100,
          purchasePrice: 10000,
          balance: 30000,
          amountOriginal: 25100,
          amountProfit: 4900,
          amountProfitPercentage: (4900 / 25100) * 100,
        }),
      ],
      error: null,
    });
  });

  it("derives and upserts a manual position from the selected catalog asset", async () => {
    mocks.prisma.manualCryptoAsset.upsert.mockResolvedValue({
      id: "crypto-eth",
    });
    const formData = new FormData();
    formData.set("assetId", "ethereum");
    formData.set("purchaseTotal", "25100,00");
    formData.set("brokerFee", "100,00");
    formData.set("purchasePrice", "10000,00");

    await expect(saveManualCryptoAsset(formData)).rejects.toThrow(
      "REDIRECT:/investments?crypto=saved",
    );

    expect(mocks.prisma.manualCryptoAsset.upsert).toHaveBeenCalledWith({
      where: {
        symbol_currencyCode: {
          symbol: "ETH",
          currencyCode: "BRL",
        },
      },
      create: {
        symbol: "ETH",
        name: "Ethereum",
        quantity: 2.5,
        averagePrice: 10040,
        currentPrice: null,
        currencyCode: "BRL",
        coingeckoId: "ethereum",
        purchaseTotal: 25100,
        brokerFee: 100,
        purchasePrice: 10000,
      },
      update: {
        name: "Ethereum",
        quantity: 2.5,
        averagePrice: 10040,
        coingeckoId: "ethereum",
        purchaseTotal: 25100,
        brokerFee: 100,
        purchasePrice: 10000,
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/investments");
  });

  it("redirects without saving invalid positions", async () => {
    const formData = new FormData();
    formData.set("assetId", "bitcoin");
    formData.set("purchaseTotal", "0");
    formData.set("brokerFee", "0");
    formData.set("purchasePrice", "100000");

    await expect(saveManualCryptoAsset(formData)).rejects.toThrow(
      "REDIRECT:/investments?crypto=invalid",
    );

    expect(mocks.prisma.manualCryptoAsset.upsert).not.toHaveBeenCalled();
  });

  it("rejects a fee that consumes the entire purchase total", async () => {
    const formData = new FormData();
    formData.set("assetId", "bitcoin");
    formData.set("purchaseTotal", "100");
    formData.set("brokerFee", "100");
    formData.set("purchasePrice", "100000");

    await expect(saveManualCryptoAsset(formData)).rejects.toThrow(
      "REDIRECT:/investments?crypto=invalid",
    );

    expect(mocks.prisma.manualCryptoAsset.upsert).not.toHaveBeenCalled();
  });

  it("uses the CoinGecko price and historical chart when an asset ID is configured", async () => {
    mocks.prisma.manualCryptoAsset.findMany.mockResolvedValue([
      {
        id: "crypto-btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 0.5,
        averagePrice: 100000,
        currentPrice: 90000,
        currencyCode: "BRL",
        coingeckoId: "bitcoin",
        purchaseTotal: 50000,
        brokerFee: 0,
        purchasePrice: 100000,
        updatedAt: new Date("2026-08-29T12:00:00.000Z"),
      },
    ]);
    mocks.coingecko.fetchCoinGeckoPrices.mockResolvedValue({
      bitcoin: {
        price: 120000,
        updatedAt: "2026-08-30T12:00:00.000Z",
      },
    });
    mocks.coingecko.fetchCoinGeckoMarketChart.mockResolvedValue([
      [new Date("2026-08-01T12:00:00.000Z").getTime(), 100000],
      [new Date("2026-08-02T12:00:00.000Z").getTime(), 120000],
    ]);

    await expect(getManualCryptoAssets()).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          coingeckoId: "bitcoin",
          currentPrice: 120000,
          balance: 60000,
          amountProfit: 10000,
          amountProfitPercentage: 20,
          priceSource: "CoinGecko",
          priceUpdatedAt: "2026-08-30T12:00:00.000Z",
          history: [
            {
              date: "2026-08-01T12:00:00.000Z",
              price: 100000,
              balance: 50000,
            },
            {
              date: "2026-08-02T12:00:00.000Z",
              price: 120000,
              balance: 60000,
            },
          ],
        }),
      ],
      error: null,
    });

    expect(mocks.coingecko.fetchCoinGeckoPrices).toHaveBeenCalledWith(
      ["bitcoin"],
      "BRL",
    );
    expect(mocks.coingecko.fetchCoinGeckoMarketChart).toHaveBeenCalledWith(
      "bitcoin",
      "BRL",
      30,
    );
  });
});
