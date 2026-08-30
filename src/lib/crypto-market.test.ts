import { describe, expect, it } from "vitest";

import {
  calculateCryptoPerformance,
  calculateCryptoPurchase,
  mapMarketChartToHistory,
} from "./crypto-market";

describe("Crypto market helpers", () => {
  it("derives the quantity and effective cost including the broker fee", () => {
    expect(
      calculateCryptoPurchase({
        purchaseTotal: 25_100,
        brokerFee: 100,
        purchasePrice: 10_000,
      }),
    ).toEqual({
      quantity: 2.5,
      averagePrice: 10_040,
      amountOriginal: 25_100,
    });
  });

  it("calculates current balance and profit percentage from the live price", () => {
    expect(
      calculateCryptoPerformance({
        quantity: 0.5,
        averagePrice: 100_000,
        currentPrice: 120_000,
      }),
    ).toEqual({
      balance: 60_000,
      amountOriginal: 50_000,
      amountProfit: 10_000,
      amountProfitPercentage: 20,
    });
  });

  it("keeps profit unavailable when the live price or cost basis is missing", () => {
    expect(
      calculateCryptoPerformance({
        quantity: 2,
        averagePrice: null,
        currentPrice: null,
      }),
    ).toEqual({
      balance: null,
      amountOriginal: null,
      amountProfit: null,
      amountProfitPercentage: null,
    });
  });

  it("turns CoinGecko market chart prices into portfolio value points", () => {
    expect(
      mapMarketChartToHistory(
        [
          [new Date("2026-08-01T12:00:00.000Z").getTime(), 100],
          [new Date("2026-08-02T12:00:00.000Z").getTime(), 120],
        ],
        2.5,
      ),
    ).toEqual([
      {
        date: "2026-08-01T12:00:00.000Z",
        price: 100,
        balance: 250,
      },
      {
        date: "2026-08-02T12:00:00.000Z",
        price: 120,
        balance: 300,
      },
    ]);
  });
});
