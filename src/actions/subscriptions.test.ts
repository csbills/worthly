import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getTransactions: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/transactions", () => ({
  getTransactions: mocks.getTransactions,
}));

import { getSubscriptions } from "./subscriptions";

function debit(id: string, date: string, description: string, amount: number) {
  return {
    id,
    date: `${date}T12:00:00.000Z`,
    description,
    amount,
    type: "DEBIT",
    categoryLabel: "Streaming",
    excludeFromSummary: false,
    currencyCode: "BRL",
  };
}

describe("getSubscriptions", () => {
  it("reads about thirteen months and totals the monthly cost", async () => {
    mocks.getTransactions.mockResolvedValue({
      error: null,
      transactions: [
        debit("a", "2026-09-10", "Spotify", 21.9),
        debit("b", "2026-10-10", "Spotify", 21.9),
        debit("c", "2025-11-03", "Anuidade Clube", 120),
        debit("d", "2026-11-01", "Anuidade Clube", 120),
      ],
    });

    const result = await getSubscriptions(new Date("2026-11-05T12:00:00Z"));

    expect(mocks.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "custom",
        dateFrom: "2025-10-01",
        dateTo: "2026-11-06",
      }),
    );
    expect(result.subscriptions.map((s) => s.key)).toEqual([
      "spotify",
      "anuidade clube",
    ]);
    expect(result.monthlyTotal).toBe(31.9);
    expect(result.yearlyTotal).toBe(382.8);
  });
});
