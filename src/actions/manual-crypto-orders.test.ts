import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    manualCryptoAsset: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    manualCryptoOrder: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/crypto-orders", async () => import("../lib/crypto-orders"));
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
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveManualCryptoOrder } from "./manual-crypto-orders";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

function createStoredOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-buy",
    side: "BUY",
    orderDate: new Date("2026-08-01T15:00:00.000Z"),
    total: 1000,
    brokerFee: 0,
    unitPrice: 100,
    quantity: 10,
    createdAt: new Date("2026-08-01T15:00:00.000Z"),
    updatedAt: new Date("2026-08-01T15:00:00.000Z"),
    ...overrides,
  };
}

function createStoredAsset(orders = [createStoredOrder()]) {
  return {
    id: "asset-btc",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 10,
    averagePrice: 100,
    currentPrice: null,
    purchaseTotal: 1000,
    brokerFee: 0,
    purchasePrice: 100,
    currencyCode: "BRL",
    coingeckoId: "bitcoin",
    createdAt: new Date("2026-08-01T15:00:00.000Z"),
    updatedAt: new Date("2026-08-01T15:00:00.000Z"),
    orders,
  };
}

describe("Manual crypto order action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.prisma),
    );
  });

  it("creates a buy order with the quantity derived from the net total", async () => {
    mocks.prisma.manualCryptoAsset.findUnique.mockResolvedValue(null);
    mocks.prisma.manualCryptoAsset.create.mockResolvedValue({
      ...createStoredAsset([]),
      quantity: 0,
      averagePrice: null,
      purchaseTotal: null,
      purchasePrice: null,
    });

    await expect(
      saveManualCryptoOrder(
        createFormData({
          assetId: "bitcoin",
          side: "BUY",
          orderDate: "2026-08-30",
          total: "1000",
          brokerFee: "10",
          unitPrice: "100",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?crypto=order-saved");

    expect(mocks.prisma.manualCryptoOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: "asset-btc",
        side: "BUY",
        total: 1000,
        brokerFee: 10,
        unitPrice: 100,
        quantity: 9.9,
        orderDate: expect.any(Date),
      }),
    });
    expect(mocks.prisma.manualCryptoAsset.update).toHaveBeenCalledWith({
      where: { id: "asset-btc" },
      data: expect.objectContaining({
        quantity: 9.9,
        averagePrice: expect.closeTo(1000 / 9.9),
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/investments");
  });

  it("rejects a sell order that exceeds the current position", async () => {
    mocks.prisma.manualCryptoAsset.findUnique.mockResolvedValue(
      createStoredAsset(),
    );

    await expect(
      saveManualCryptoOrder(
        createFormData({
          assetId: "bitcoin",
          side: "SELL",
          orderDate: "2026-08-30",
          total: "1100",
          brokerFee: "0",
          unitPrice: "100",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?crypto=invalid-order");

    expect(mocks.prisma.manualCryptoOrder.create).not.toHaveBeenCalled();
    expect(mocks.prisma.manualCryptoAsset.update).not.toHaveBeenCalled();
  });

  it("edits an existing order and persists its manually entered date", async () => {
    const existingAsset = createStoredAsset();
    mocks.prisma.manualCryptoOrder.findUnique.mockResolvedValue({
      ...existingAsset.orders[0],
      asset: existingAsset,
    });

    await expect(
      saveManualCryptoOrder(
        createFormData({
          orderId: "order-buy",
          assetId: "bitcoin",
          side: "BUY",
          orderDate: "2026-08-15",
          total: "2000",
          brokerFee: "20",
          unitPrice: "100",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?crypto=order-saved");

    expect(mocks.prisma.manualCryptoOrder.update).toHaveBeenCalledWith({
      where: { id: "order-buy" },
      data: expect.objectContaining({
        side: "BUY",
        total: 2000,
        brokerFee: 20,
        unitPrice: 100,
        quantity: 19.8,
        orderDate: expect.any(Date),
      }),
    });
  });
});
