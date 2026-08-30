import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchCoinGeckoMarketChart, fetchCoinGeckoPrices } from "./coingecko";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("CoinGecko client", () => {
  it("batches current prices by coin ID and currency", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        bitcoin: {
          brl: 350_000,
          last_updated_at: 1_756_560_000,
        },
      }),
    );

    await expect(
      fetchCoinGeckoPrices(["bitcoin", "ethereum"], "BRL", fetcher),
    ).resolves.toEqual({
      bitcoin: {
        price: 350_000,
        updatedAt: "2025-08-30T13:20:00.000Z",
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("ids=bitcoin%2Cethereum"),
      expect.objectContaining({
        next: { revalidate: 300 },
      }),
    );
  });

  it("parses historical prices for a coin", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        prices: [
          [1_754_064_000_000, 100],
          [1_754_150_400_000, 120],
        ],
      }),
    );

    await expect(
      fetchCoinGeckoMarketChart("bitcoin", "BRL", 30, fetcher),
    ).resolves.toEqual([
      [1_754_064_000_000, 100],
      [1_754_150_400_000, 120],
    ]);

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining(
        "coins/bitcoin/market_chart?vs_currency=brl&days=30&interval=daily",
      ),
      expect.objectContaining({
        next: { revalidate: 3600 },
      }),
    );
  });

  it("raises an error when CoinGecko responds with a failure", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 429));

    await expect(
      fetchCoinGeckoPrices(["bitcoin"], "BRL", fetcher),
    ).rejects.toThrow("CoinGecko request failed: 429");
  });
});
