import { describe, expect, it } from "vitest";

import {
  calculateCryptoOrderQuantity,
  calculateCryptoPosition,
  InsufficientCryptoQuantityError,
} from "./crypto-orders";

describe("Crypto order calculations", () => {
  it("calculates the net quantity and applies average cost to buys and sells", () => {
    const position = calculateCryptoPosition([
      {
        id: "buy-later",
        side: "BUY",
        orderDate: "2026-08-20",
        total: 500,
        brokerFee: 0,
        unitPrice: 125,
      },
      {
        id: "sell",
        side: "SELL",
        orderDate: "2026-08-25",
        total: 600,
        brokerFee: 6,
        unitPrice: 100,
      },
      {
        id: "buy-first",
        side: "BUY",
        orderDate: "2026-08-10",
        total: 1000,
        brokerFee: 10,
        unitPrice: 100,
      },
    ]);

    const initialQuantity = 9.9 + 4;
    const initialAveragePrice = 1500 / initialQuantity;
    const soldQuantity = (600 - 6) / 100;
    const expectedCostBasisReduction = initialAveragePrice * soldQuantity;

    expect(calculateCryptoOrderQuantity(1000, 10, 100)).toBeCloseTo(9.9);
    expect(position.quantity).toBeCloseTo(initialQuantity - soldQuantity);
    expect(position.amountOriginal).toBeCloseTo(
      1500 - expectedCostBasisReduction,
    );
    expect(position.averagePrice).toBeCloseTo(
      (1500 - expectedCostBasisReduction) / (initialQuantity - soldQuantity),
    );
    expect(position.realizedProfit).toBeCloseTo(
      600 - 6 - expectedCostBasisReduction,
    );
    expect(position.totalBought).toBe(1500);
    expect(position.totalSold).toBe(600);
  });

  it("rejects a sale above the available quantity", () => {
    expect(() =>
      calculateCryptoPosition([
        {
          side: "BUY",
          orderDate: "2026-08-01",
          total: 1000,
          brokerFee: 0,
          unitPrice: 100,
        },
        {
          side: "SELL",
          orderDate: "2026-08-02",
          total: 1100,
          brokerFee: 0,
          unitPrice: 100,
        },
      ]),
    ).toThrow(InsufficientCryptoQuantityError);
  });

  it("returns an empty position when all units have been sold", () => {
    const position = calculateCryptoPosition([
      {
        side: "BUY",
        orderDate: "2026-08-01",
        total: 1000,
        brokerFee: 10,
        unitPrice: 100,
      },
      {
        side: "SELL",
        orderDate: "2026-08-05",
        total: 1200,
        brokerFee: 12,
        unitPrice: 120,
      },
    ]);

    expect(position.quantity).toBeCloseTo(0);
    expect(position.amountOriginal).toBeCloseTo(0);
    expect(position.averagePrice).toBeNull();
    expect(position.realizedProfit).toBeCloseTo(188);
  });
});
