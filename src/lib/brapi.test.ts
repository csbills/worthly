import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchBrapiMarketHistory, fetchBrapiPrices } from "./brapi";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Brapi market data client", () => {
  it("batches stock and ETF quotes and preserves the returned quote time", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            requestedSymbol: "PETR4",
            symbol: "PETR4",
            data: {
              regularMarketPrice: 38.5,
              regularMarketTime: "2026-08-31T18:00:00.000Z",
            },
          },
        ],
      }),
    );

    await expect(
      fetchBrapiPrices(["PETR4", "IVVB11"], "STOCK", fetcher),
    ).resolves.toEqual({
      PETR4: {
        price: 38.5,
        updatedAt: "2026-08-31T18:00:00.000Z",
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/stocks/quote?symbols=PETR4%2CIVVB11"),
      expect.objectContaining({ next: { revalidate: 300 } }),
    );
  });

  it("reads stock and ETF history nested in the result data payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            symbol: "IVVB11",
            data: {
              historicalDataPrice: [
                {
                  date: 1_756_560_000,
                  close: 300,
                  adjustedClose: 301.5,
                },
              ],
            },
          },
        ],
      }),
    );

    await expect(
      fetchBrapiMarketHistory(["IVVB11"], "ETF", 30, fetcher),
    ).resolves.toEqual({
      IVVB11: [[1_756_560_000_000, 301.5]],
    });
  });

  it("parses FII quote and historical adjusted close values", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          fiis: [
            {
              symbol: "MXRF11",
              price: 10.25,
              asOfDate: "2026-08-31T00:00:00.000Z",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          fiis: [
            {
              symbol: "MXRF11",
              historicalDataPrice: [
                {
                  date: 1_756_560_000,
                  close: 10,
                  adjustedClose: 10.2,
                },
              ],
            },
          ],
        }),
      );

    await expect(fetchBrapiPrices(["MXRF11"], "FII", fetcher)).resolves.toEqual(
      {
        MXRF11: {
          price: 10.25,
          updatedAt: "2026-08-31T00:00:00.000Z",
        },
      },
    );

    await expect(
      fetchBrapiMarketHistory(["MXRF11"], "FII", 30, fetcher),
    ).resolves.toEqual({
      MXRF11: [[1_756_560_000_000, 10.2]],
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/fii/historical?symbols=MXRF11"),
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
  });

  it("raises an error for failed market responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 401));

    await expect(fetchBrapiPrices(["PETR4"], "STOCK", fetcher)).rejects.toThrow(
      "Brapi request failed: 401",
    );
  });
});
