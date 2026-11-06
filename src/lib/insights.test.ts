import { describe, expect, it } from "vitest";

import { buildInsights, type InsightInput } from "./insights";

const base: InsightInput = {
  now: new Date("2026-11-05T15:00:00Z"),
  budgets: [],
  subscriptions: [],
  cards: [],
  pace: null,
  goals: [],
};

describe("insights", () => {
  it("is quiet when there is nothing to say", () => {
    expect(buildInsights(base)).toEqual([]);
  });

  it("warns about bills due soon and broken budgets first", () => {
    const insights = buildInsights({
      ...base,
      goals: [{ id: "g", name: "Reserva", done: true, progress: 1 }],
      cards: [
        {
          id: "c1",
          name: "Nubank",
          openBalanceAmount: 3494.36,
          openDueDate: "2026-11-08",
        },
        {
          id: "c2",
          name: "Inter",
          openBalanceAmount: 100,
          openDueDate: "2026-11-30",
        },
        {
          id: "c3",
          name: "Zerado",
          openBalanceAmount: 0,
          openDueDate: "2026-11-06",
        },
      ],
      budgets: [
        {
          groupId: "11",
          label: "Alimentação",
          status: "over",
          spent: 900,
          amount: 800,
          projected: 1500,
        },
        {
          groupId: "19",
          label: "Transporte",
          status: "ok",
          spent: 10,
          amount: 300,
          projected: 60,
        },
      ],
    });

    expect(insights.map((insight) => insight.id)).toEqual([
      "card-due-c1",
      "budget-over-11",
      "goal-done-g",
    ]);
    expect(insights[0].title).toBe("A fatura do Nubank vence em 3 dias");
    expect(insights[1].ask).toContain("Alimentação");
  });

  it("notices a faster pace, pricier and new subscriptions", () => {
    const insights = buildInsights({
      ...base,
      pace: {
        elapsedDays: 10,
        current: 1300,
        previous: 1000,
        previousLabel: "outubro",
      },
      subscriptions: [
        {
          key: "netflix",
          name: "Netflix",
          lastAmount: 59.9,
          priceChange: 0.072,
          isNew: false,
        },
        {
          key: "max",
          name: "Max",
          lastAmount: 39.9,
          priceChange: null,
          isNew: true,
        },
      ],
    });

    expect(insights.map((insight) => insight.title)).toEqual([
      "Você está gastando 30% mais que em outubro",
      "Netflix ficou 7% mais cara",
      "Nova cobrança recorrente: Max",
    ]);
  });

  it("keeps the list short", () => {
    const budgets = Array.from({ length: 6 }, (_, index) => ({
      groupId: String(index),
      label: `G${index}`,
      status: "over" as const,
      spent: 2,
      amount: 1,
      projected: 3,
    }));

    expect(buildInsights({ ...base, budgets })).toHaveLength(4);
  });
});
