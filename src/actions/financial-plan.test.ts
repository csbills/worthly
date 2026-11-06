import { describe, expect, it, vi } from "vitest";

import { defaultFinancialProfile } from "@/lib/financial-profile";

const mocks = vi.hoisted(() => ({ getTransactions: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/transactions", () => ({
  getTransactions: mocks.getTransactions,
}));
vi.mock("@/actions/pluggy", () => ({
  getConnectedAccounts: async () => ({
    error: null,
    accounts: [
      { id: "acc-caio", itemId: "item-caio", type: "BANK", balance: 8000 },
      { id: "acc-ana", itemId: "item-ana", type: "BANK", balance: 4000 },
      { id: "card-ana", itemId: "item-ana", type: "CREDIT", balance: 900 },
    ],
  }),
}));
vi.mock("@/actions/household", () => ({
  getHousehold: async () => ({
    members: [
      { id: "caio", name: "Caio" },
      { id: "ana", name: "Ana" },
    ],
    connections: [
      { itemId: "item-caio", connectorName: "Nubank", memberId: "caio" },
      { itemId: "item-ana", connectorName: "Inter", memberId: "ana" },
    ],
  }),
  getFinancialProfile: async () => ({
    ...defaultFinancialProfile,
    saved: true,
  }),
  listObligations: async () => [],
}));
vi.mock("@/actions/goals", () => ({ listGoals: async () => [] }));
vi.mock("@/actions/investments", () => ({
  getInvestments: async () => ({
    currencies: [{ currencyCode: "BRL", balance: 30000 }],
  }),
}));
vi.mock("@/actions/subscriptions", () => ({
  getSubscriptions: async () => ({
    subscriptions: [
      {
        key: "lar imoveis",
        name: "Aluguel - Lar Imóveis",
        category: "Aluguel",
        monthlyCost: 3400,
      },
      {
        key: "netflix",
        name: "Netflix",
        category: "Streaming",
        monthlyCost: 59.9,
      },
    ],
  }),
}));

import { getFinancialPlan, simulateFinancialPlan } from "./financial-plan";

function tx(
  accountId: string,
  date: string,
  type: string,
  amount: number,
  categoryId: string,
) {
  return {
    accountId,
    date: `${date}T15:00:00.000Z`,
    type,
    amount,
    categoryId,
    excludeFromSummary: false,
  };
}

describe("getFinancialPlan", () => {
  it("joins both people's accounts into one household plan", async () => {
    mocks.getTransactions.mockResolvedValue({
      error: null,
      transactions: ["2026-08", "2026-09", "2026-10"].flatMap((month) => [
        tx("acc-caio", `${month}-05`, "CREDIT", 9000, "01010000"),
        tx("acc-ana", `${month}-05`, "CREDIT", 6000, "01010000"),
        tx("acc-caio", `${month}-10`, "DEBIT", 3400, "17010000"),
        tx("card-ana", `${month}-12`, "DEBIT", 1500, "10000000"),
      ]),
    });

    const result = await getFinancialPlan(new Date("2026-11-05T15:00:00Z"));

    expect(mocks.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "custom",
        dateFrom: "2026-05-01",
        dateTo: "2026-11-01",
      }),
    );
    expect(result.baseline).toMatchObject({
      typicalIncome: 15000,
      typicalExpenses: 4900,
      savingsCapacity: 10100,
    });
    expect(result.baseline.members.map((member) => member.name)).toEqual([
      "Caio",
      "Ana",
    ]);
    expect(result.balances).toEqual({ liquid: 12000, invested: 30000 });
    expect(result.candidates).toEqual([
      { name: "Aluguel - Lar Imóveis", kind: "rent", monthlyAmount: 3400 },
    ]);
    expect(result.ownershipIncomplete).toBe(false);
    expect(result.plan.steps.length).toBeGreaterThan(0);
  });

  it("simulates saving more without touching the saved plan", async () => {
    const { base, simulated } = await simulateFinancialPlan(
      {
        extraMonthly: 2000,
        desiredMonthlyCost: null,
        targetAge: null,
        realReturn: null,
      },
      new Date("2026-11-05T15:00:00Z"),
    );

    expect(simulated.capacity).toBe(base.capacity + 2000);
    expect(
      simulated.independence.scenarios[0].monthsToGoal as number,
    ).toBeLessThan(base.independence.scenarios[0].monthsToGoal as number);
  });
});
