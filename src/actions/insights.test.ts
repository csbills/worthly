import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/actions/budgets", () => ({
  getBudgetsOverview: async () => {
    throw new Error("Pluggy fora do ar");
  },
}));
vi.mock("@/actions/subscriptions", () => ({
  getSubscriptions: async () => ({ subscriptions: [] }),
}));
vi.mock("@/actions/credit-cards", () => ({
  getCreditCards: async () => ({
    cards: [
      {
        id: "c1",
        name: "Nubank",
        openBalanceAmount: 500,
        openDueDate: "2026-11-06",
      },
    ],
  }),
}));
vi.mock("@/actions/overview", () => ({
  getSpendingPace: async () => ({
    currentMonth: { elapsedDays: 10 },
    previousMonth: { label: "outubro" },
    points: [{ day: 10, current: 2000, previous: 1000 }],
  }),
}));
vi.mock("@/actions/goals", () => ({ listGoals: async () => [] }));

import { getInsights } from "./insights";

describe("getInsights", () => {
  it("combines the sources and survives one of them failing", async () => {
    const insights = await getInsights(new Date("2026-11-05T15:00:00Z"));

    expect(insights.map((insight) => insight.id)).toEqual([
      "card-due-c1",
      "pace-above",
    ]);
  });
});
