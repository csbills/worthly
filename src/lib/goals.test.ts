import { describe, expect, it } from "vitest";

import { evaluateGoal } from "./goals";

const now = new Date("2026-11-05T12:00:00Z");

describe("goals", () => {
  it("computes progress and the monthly amount to reach the date", () => {
    expect(
      evaluateGoal({
        targetAmount: 12000,
        savedAmount: 3000,
        targetDate: "2027-05",
        now,
      }),
    ).toEqual({
      progress: 0.25,
      remaining: 9000,
      done: false,
      monthsLeft: 6,
      monthlyNeeded: 1500,
    });
  });

  it("handles goals without a date, past dates and finished goals", () => {
    expect(
      evaluateGoal({
        targetAmount: 100,
        savedAmount: 40,
        targetDate: null,
        now,
      }),
    ).toMatchObject({ monthsLeft: null, monthlyNeeded: null });
    expect(
      evaluateGoal({
        targetAmount: 100,
        savedAmount: 40,
        targetDate: "2026-01",
        now,
      }),
    ).toMatchObject({ monthsLeft: 1, monthlyNeeded: 60 });
    expect(
      evaluateGoal({
        targetAmount: 100,
        savedAmount: 130,
        targetDate: "2027-01",
        now,
      }),
    ).toMatchObject({
      progress: 1,
      remaining: 0,
      done: true,
      monthlyNeeded: null,
    });
  });
});
