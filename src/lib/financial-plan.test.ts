import { describe, expect, it } from "vitest";

import type { FinancialBaseline } from "./financial-baseline";
import {
  buildFinancialPlan,
  type PlanProfile,
  recommendedEmergencyMonths,
} from "./financial-plan";

const now = new Date("2026-11-05T15:00:00Z");

function baseline(
  overrides: Partial<FinancialBaseline> = {},
): FinancialBaseline {
  return {
    monthsAnalyzed: 6,
    confidence: "high",
    months: [],
    typicalIncome: 15000,
    typicalExpenses: 11000,
    typicalEssential: 8000,
    typicalDiscretionary: 3000,
    averageIncome: 15000,
    averageExpenses: 11000,
    savingsCapacity: 4000,
    savingsRate: 0.267,
    incomeVariation: 0,
    groups: [
      {
        groupId: "17000000",
        label: "Moradia",
        icon: "🏠",
        essential: true,
        monthlyTypical: 5000,
        lastMonth: 5000,
      },
      {
        groupId: "11000000",
        label: "Alimentos e bebidas",
        icon: "🍽️",
        essential: false,
        monthlyTypical: 1400,
        lastMonth: 1500,
      },
      {
        groupId: "21000000",
        label: "Lazer",
        icon: "🎟️",
        essential: false,
        monthlyTypical: 900,
        lastMonth: 700,
      },
      {
        groupId: "08000000",
        label: "Compras",
        icon: "🛍️",
        essential: false,
        monthlyTypical: 700,
        lastMonth: 400,
      },
      {
        groupId: "09000000",
        label: "Serviços digitais",
        icon: "💻",
        essential: false,
        monthlyTypical: 60,
        lastMonth: 60,
      },
    ],
    members: [],
    debt: {
      financingMonthly: 3000,
      loansMonthly: 0,
      interestAndFees: 0,
      hasExpensiveDebt: false,
    },
    ...overrides,
  };
}

const married: PlanProfile = {
  householdType: "couple",
  dependents: 0,
  incomeStability: "stable",
  incomeEarners: 2,
  birthYear: 1992,
  targetIndependenceAge: 55,
  desiredMonthlyCost: null,
  expectedRealReturn: 4,
  withdrawalRate: 4,
  emergencyMonths: null,
};

const mortgage = {
  id: "o1",
  name: "Financiamento do apê",
  kind: "financing",
  monthlyAmount: 3000,
  endMonth: "2034-06",
  balance: 220000,
  interestRate: 11,
};

describe("recommendedEmergencyMonths", () => {
  it("asks for more cushion when one income holds the house or income varies", () => {
    expect(
      recommendedEmergencyMonths({
        ...married,
        householdType: "single",
        incomeEarners: 1,
      }),
    ).toBe(3);
    expect(recommendedEmergencyMonths(married)).toBe(3);
    expect(recommendedEmergencyMonths({ ...married, incomeEarners: 1 })).toBe(
      5,
    );
    expect(
      recommendedEmergencyMonths({
        ...married,
        incomeEarners: 1,
        dependents: 2,
        incomeStability: "variable",
      }),
    ).toBe(9);
  });
});

describe("buildFinancialPlan", () => {
  const plan = buildFinancialPlan({
    baseline: baseline(),
    profile: married,
    obligations: [mortgage],
    balances: { liquid: 10000, invested: 50000 },
    existingGoalNames: [],
    now,
  });

  it("sizes the emergency fund on essential spending", () => {
    expect(plan.emergency).toMatchObject({
      months: 3,
      essentialMonthly: 8000,
      target: 24000,
      current: 10000,
      gap: 14000,
      monthlyContribution: 2800,
      monthsToComplete: 5,
      done: false,
    });
  });

  it("drops the mortgage from the independence cost and frees it when it ends", () => {
    expect(plan.independence.monthlyCost).toBe(8000);
    expect(plan.independence.target).toBe(2400000);
    expect(plan.obligations.freed).toEqual([
      { month: "2034-07", name: "Financiamento do apê", amount: 3000 },
    ]);
    expect(plan.obligations.hints[0]?.text).toContain("Amortizar");
  });

  it("shows how reinvesting the mortgage money and small cuts shorten the road", () => {
    const [current, freed, cuts] = plan.independence.scenarios;

    expect(plan.independence.scenarios.map((s) => s.key)).toEqual([
      "current",
      "freed",
      "cuts",
    ]);
    expect(current.monthsToGoal).not.toBeNull();
    expect(freed.monthsToGoal as number).toBeLessThan(
      current.monthsToGoal as number,
    );
    expect(cuts.monthsToGoal as number).toBeLessThan(
      freed.monthsToGoal as number,
    );
    expect(cuts.label).toContain("R$ 460");
    expect(plan.cuts.map((cut) => cut.suggested)).toEqual([210, 140, 110]);
    expect(current.points.length).toBeGreaterThan(5);
  });

  it("checks the target age against the real capacity", () => {
    expect(plan.independence.requiredMonthly).toBeGreaterThan(4000);
    expect(["tight", "far"]).toContain(plan.independence.status);
  });

  it("orders the steps and suggests the missing goals", () => {
    expect(plan.steps.map((step) => step.key)).toEqual([
      "emergency",
      "freed-Financiamento do apê",
      "invest",
      "cuts",
    ]);
    expect(plan.goalSuggestions.map((goal) => goal.key)).toEqual([
      "emergency",
      "independence",
    ]);

    const withGoals = buildFinancialPlan({
      baseline: baseline(),
      profile: married,
      obligations: [],
      balances: { liquid: 10000, invested: 50000 },
      existingGoalNames: ["Reserva", "Liberdade financeira"],
      now,
    });
    expect(withGoals.goalSuggestions).toEqual([]);
  });

  it("puts balancing the month and expensive debt first", () => {
    const tight = buildFinancialPlan({
      baseline: baseline({
        savingsCapacity: -600,
        debt: {
          financingMonthly: 0,
          loansMonthly: 0,
          interestAndFees: 480,
          hasExpensiveDebt: true,
        },
      }),
      profile: married,
      obligations: [],
      balances: { liquid: 0, invested: 0 },
      existingGoalNames: [],
      now,
    });

    expect(tight.steps.slice(0, 2).map((step) => step.key)).toEqual([
      "balance",
      "debt",
    ]);
    expect(tight.capacity).toBe(0);
    expect(tight.emergency.monthsToComplete).toBeNull();
  });

  it("lets a single person with no mortgage get there sooner on the same income", () => {
    const single = buildFinancialPlan({
      baseline: baseline({
        typicalExpenses: 7000,
        typicalEssential: 4500,
        savingsCapacity: 8000,
      }),
      profile: { ...married, householdType: "single", incomeEarners: 1 },
      obligations: [],
      balances: { liquid: 10000, invested: 50000 },
      existingGoalNames: [],
      now,
    });

    expect(
      single.independence.scenarios[0].monthsToGoal as number,
    ).toBeLessThan(plan.independence.scenarios[0].monthsToGoal as number);
  });
});
