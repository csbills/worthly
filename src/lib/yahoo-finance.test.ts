import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchYahooMarketData } from "./yahoo-finance";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Yahoo Finance market data client", () => {
  it("fetches Brazilian tickers without an API token and parses quote history", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        chart: {
          result: [
            {
              meta: {
                symbol: "PETR4.SA",
                regularMarketPrice: 38.5,
                regularMarketTime: 1_756_560_000,
              },
              timestamp: [1_756_473_600, 1_756_560_000],
              indicators: {
                quote: [{ close: [37, 38.4] }],
                adjclose: [{ adjclose: [37.2, 38.5] }],
              },
            },
          ],
        },
      }),
    );

    await expect(fetchYahooMarketData(["PETR4"], 90, fetcher)).resolves.toEqual(
      {
        PETR4: {
          price: {
            price: 38.5,
            updatedAt: "2025-08-30T13:20:00.000Z",
          },
          history: [
            [1_756_473_600_000, 37.2],
            [1_756_560_000_000, 38.5],
          ],
        },
      },
    );

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/PETR4\.SA/),
      expect.objectContaining({ next: { revalidate: 300 } }),
    );
  });

  it("keeps available assets when one public quote request fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          chart: {
            result: [
              {
                meta: { regularMarketPrice: 10 },
                timestamp: [1_756_560_000],
                indicators: { quote: [{ close: [10] }] },
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}, 404));

    await expect(
      fetchYahooMarketData(["MXRF11", "B5P211"], 90, fetcher),
    ).resolves.toEqual({
      MXRF11: {
        price: {
          price: 10,
          updatedAt: "2025-08-30T13:20:00.000Z",
        },
        history: [[1_756_560_000_000, 10]],
      },
    });
  });
});
