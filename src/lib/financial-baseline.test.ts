import { describe, expect, it } from "vitest";

import {
  type BaselineTransaction,
  buildFinancialBaseline,
  completedMonthKeys,
} from "./financial-baseline";

const now = new Date("2026-11-05T15:00:00Z");

function tx(
  date: string,
  type: "CREDIT" | "DEBIT",
  amount: number,
  categoryId: string | null,
  accountId = "caio-conta",
  extra: Partial<BaselineTransaction> = {},
): BaselineTransaction {
  return {
    date: `${date}T15:00:00.000Z`,
    type,
    amount,
    accountId,
    categoryId,
    excludeFromSummary: false,
    ...extra,
  };
}

const owners = new Map([
  ["caio-conta", { id: "caio", name: "Caio" }],
  ["ana-conta", { id: "ana", name: "Ana" }],
]);

function householdMonth(month: string, extraDebit = 0) {
  return [
    tx(`${month}-05`, "CREDIT", 9000, "01010000"),
    tx(`${month}-05`, "CREDIT", 6000, "01010000", "ana-conta"),
    tx(`${month}-10`, "DEBIT", 2500, "02030001"), // financiamento do apê
    tx(`${month}-12`, "DEBIT", 1200, "10000000", "ana-conta"), // mercado
    tx(`${month}-20`, "DEBIT", 800 + extraDebit, "21000000"), // lazer
  ];
}

describe("completedMonthKeys", () => {
  it("lists closed months before today, oldest first", () => {
    expect(completedMonthKeys(now, 3)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(completedMonthKeys(new Date("2026-01-10T12:00:00Z"), 2)).toEqual([
      "2025-11",
      "2025-12",
    ]);
  });
});

describe("buildFinancialBaseline", () => {
  it("finds the typical month of a two-income household with a mortgage", () => {
    const baseline = buildFinancialBaseline({
      transactions: [
        ...householdMonth("2026-08"),
        ...householdMonth("2026-09"),
        // Mês atípico: uma TV à vista não muda o mês típico.
        ...householdMonth("2026-10", 4000),
        // Mês corrente fica fora: ainda não fechou.
        tx("2026-11-02", "DEBIT", 999, "21000000"),
        // Transferência entre o casal já vem excluída.
        tx("2026-10-15", "DEBIT", 3000, "05000000", "caio-conta", {
          excludeFromSummary: true,
        }),
      ],
      accountOwners: owners,
      now,
    });

    expect(baseline).toMatchObject({
      monthsAnalyzed: 3,
      confidence: "medium",
      typicalIncome: 15000,
      typicalExpenses: 4500,
      typicalEssential: 3700,
      typicalDiscretionary: 800,
      savingsCapacity: 10500,
      savingsRate: 0.7,
      incomeVariation: 0,
      debt: {
        financingMonthly: 2500,
        loansMonthly: 0,
        interestAndFees: 0,
        hasExpensiveDebt: false,
      },
    });
    expect(baseline.averageExpenses).toBeCloseTo(5833.33, 1);
    expect(baseline.members).toEqual([
      {
        memberId: "caio",
        name: "Caio",
        typicalIncome: 9000,
        typicalExpenses: 3300,
      },
      {
        memberId: "ana",
        name: "Ana",
        typicalIncome: 6000,
        typicalExpenses: 1200,
      },
    ]);
    expect(baseline.groups[0]).toMatchObject({
      groupId: "02000000",
      essential: true,
      monthlyTypical: 2500,
    });
    expect(baseline.groups.find((g) => g.groupId === "21000000")).toMatchObject(
      {
        essential: false,
        monthlyTypical: 800,
        lastMonth: 4800,
      },
    );
  });

  it("flags expensive debt paid in more than one month", () => {
    const baseline = buildFinancialBaseline({
      transactions: [
        tx("2026-09-05", "CREDIT", 3000, "01010000"),
        tx("2026-09-08", "DEBIT", 120, "02010000"),
        tx("2026-10-05", "CREDIT", 3000, "01010000"),
        tx("2026-10-08", "DEBIT", 90, "02020000"),
      ],
      accountOwners: new Map(),
      now,
    });

    expect(baseline.debt).toMatchObject({
      interestAndFees: 210,
      hasExpensiveDebt: true,
    });
    expect(baseline.confidence).toBe("low");
    expect(baseline.members[0]?.name).toBe("Sem dono definido");
  });

  it("handles a house with no history yet", () => {
    expect(
      buildFinancialBaseline({
        transactions: [],
        accountOwners: new Map(),
        now,
      }),
    ).toMatchObject({
      monthsAnalyzed: 0,
      typicalIncome: 0,
      savingsCapacity: 0,
      savingsRate: 0,
    });
  });
});
