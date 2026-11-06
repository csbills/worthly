import { describe, expect, it } from "vitest";

import { evaluateBudget, suggestBudgetAmount } from "./budgets";

describe("budgets", () => {
  it("is ok while spending is low and on pace", () => {
    expect(
      evaluateBudget({
        amount: 1000,
        spent: 300,
        dayOfMonth: 15,
        daysInMonth: 30,
      }),
    ).toEqual({
      spent: 300,
      amount: 1000,
      used: 0.3,
      remaining: 700,
      projected: 600,
      status: "ok",
    });
  });

  it("warns at 80% or when the pace would break the limit", () => {
    expect(
      evaluateBudget({
        amount: 1000,
        spent: 820,
        dayOfMonth: 28,
        daysInMonth: 30,
      }).status,
    ).toBe("warning");
    expect(
      evaluateBudget({
        amount: 1000,
        spent: 500,
        dayOfMonth: 10,
        daysInMonth: 30,
      }).status,
    ).toBe("warning");
    // No começo do mês a projeção não conta.
    expect(
      evaluateBudget({
        amount: 1000,
        spent: 300,
        dayOfMonth: 3,
        daysInMonth: 30,
      }).status,
    ).toBe("ok");
  });

  it("is over once the limit is passed", () => {
    expect(
      evaluateBudget({
        amount: 500,
        spent: 640,
        dayOfMonth: 20,
        daysInMonth: 31,
      }),
    ).toMatchObject({ status: "over", remaining: -140 });
  });

  it("suggests a rounded-up average of months with spending", () => {
    expect(suggestBudgetAmount([412.3, 0, 388])).toBe(410);
    expect(suggestBudgetAmount([1830, 2210])).toBe(2100);
    expect(suggestBudgetAmount([0, 0])).toBeNull();
  });
});
