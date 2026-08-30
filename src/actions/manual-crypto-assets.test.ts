import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    manualCryptoAsset: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
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
          currencyCode: "BRL",
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

  it("normalizes and upserts a manual position from the form", async () => {
    mocks.prisma.manualCryptoAsset.upsert.mockResolvedValue({
      id: "crypto-eth",
    });
    const formData = new FormData();
    formData.set("symbol", " eth ");
    formData.set("name", " Ethereum ");
    formData.set("quantity", "2,5");
    formData.set("averagePrice", "10000,00");
    formData.set("currentPrice", "12000,00");
    formData.set("currencyCode", "BRL");

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
        averagePrice: 10000,
        currentPrice: 12000,
        currencyCode: "BRL",
      },
      update: {
        name: "Ethereum",
        quantity: 2.5,
        averagePrice: 10000,
        currentPrice: 12000,
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/investments");
  });

  it("redirects without saving invalid positions", async () => {
    const formData = new FormData();
    formData.set("symbol", "BTC");
    formData.set("name", "Bitcoin");
    formData.set("quantity", "0");
    formData.set("currentPrice", "100000");
    formData.set("currencyCode", "BRL");

    await expect(saveManualCryptoAsset(formData)).rejects.toThrow(
      "REDIRECT:/investments?crypto=invalid",
    );

    expect(mocks.prisma.manualCryptoAsset.upsert).not.toHaveBeenCalled();
  });
});
