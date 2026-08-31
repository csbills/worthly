import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    manualMarketAsset: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    manualMarketOrder: {
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
vi.mock("@/lib/market-assets", async () => import("../lib/market-assets"));
vi.mock("@/lib/crypto-orders", async () => import("../lib/crypto-orders"));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { saveManualMarketOrder } from "./manual-market-orders";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

function createAssetWithBuyOrder() {
  const createdAt = new Date("2026-08-01T12:00:00.000Z");

  return {
    id: "market-petr4",
    symbol: "PETR4",
    name: "Petrobras PN",
    assetType: "STOCK",
    quantity: 49.5,
    averagePrice: 1000 / 49.5,
    currentPrice: null,
    currencyCode: "BRL",
    createdAt,
    orders: [
      {
        id: "order-buy",
        side: "BUY",
        orderDate: createdAt,
        total: 1000,
        brokerFee: 10,
        unitPrice: 20,
        quantity: 49.5,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

describe("Manual market order action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.prisma),
    );
  });

  it("creates a stock buy order with quantity derived from the net total", async () => {
    mocks.prisma.manualMarketAsset.findUnique.mockResolvedValue(null);
    mocks.prisma.manualMarketAsset.create.mockResolvedValue({
      id: "market-petr4",
      symbol: "PETR4",
      name: "Petrobras PN",
      assetType: "STOCK",
      quantity: 0,
      averagePrice: null,
      currentPrice: null,
      currencyCode: "BRL",
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
      orders: [],
    });

    await expect(
      saveManualMarketOrder(
        createFormData({
          assetId: "PETR4",
          side: "BUY",
          orderDate: "2026-08-30",
          total: "1000",
          brokerFee: "10",
          unitPrice: "20",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?market=order-saved");

    expect(mocks.prisma.manualMarketOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: "market-petr4",
        side: "BUY",
        total: 1000,
        brokerFee: 10,
        unitPrice: 20,
        quantity: 49.5,
        orderDate: expect.any(Date),
      }),
    });
    expect(mocks.prisma.manualMarketAsset.update).toHaveBeenCalledWith({
      where: { id: "market-petr4" },
      data: expect.objectContaining({
        quantity: 49.5,
        averagePrice: expect.closeTo(1000 / 49.5),
        assetType: "STOCK",
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/investments");
  });

  it("creates a sell order and recalculates the remaining position", async () => {
    mocks.prisma.manualMarketAsset.findUnique.mockResolvedValue(
      createAssetWithBuyOrder(),
    );

    await expect(
      saveManualMarketOrder(
        createFormData({
          assetId: "PETR4",
          side: "SELL",
          orderDate: "2026-08-31",
          total: "400",
          brokerFee: "4",
          unitPrice: "25",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?market=order-saved");

    expect(mocks.prisma.manualMarketOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        side: "SELL",
        quantity: expect.closeTo(396 / 25),
      }),
    });
    expect(mocks.prisma.manualMarketAsset.update).toHaveBeenCalledWith({
      where: { id: "market-petr4" },
      data: expect.objectContaining({
        quantity: expect.closeTo(49.5 - 396 / 25),
        averagePrice: expect.closeTo(20.2020202020202),
      }),
    });
  });

  it("rejects a sale that exceeds the available quantity", async () => {
    mocks.prisma.manualMarketAsset.findUnique.mockResolvedValue(
      createAssetWithBuyOrder(),
    );

    await expect(
      saveManualMarketOrder(
        createFormData({
          assetId: "PETR4",
          side: "SELL",
          orderDate: "2026-08-31",
          total: "1000",
          brokerFee: "0",
          unitPrice: "10",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?market=invalid-order");

    expect(mocks.prisma.manualMarketOrder.create).not.toHaveBeenCalled();
  });

  it("edits an existing order and recalculates the asset", async () => {
    const asset = createAssetWithBuyOrder();
    mocks.prisma.manualMarketOrder.findUnique.mockResolvedValue({
      ...asset.orders[0],
      asset,
    });

    await expect(
      saveManualMarketOrder(
        createFormData({
          orderId: "order-buy",
          assetId: "PETR4",
          side: "BUY",
          orderDate: "2026-08-15",
          total: "1200",
          brokerFee: "12",
          unitPrice: "24",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/investments?market=order-saved");

    expect(mocks.prisma.manualMarketOrder.update).toHaveBeenCalledWith({
      where: { id: "order-buy" },
      data: expect.objectContaining({
        orderDate: new Date("2026-08-15T12:00:00.000Z"),
        quantity: expect.closeTo(1188 / 24),
      }),
    });
  });
});
