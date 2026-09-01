import { describe, expect, it } from "vitest";

import { calculateNetWorth, compareNetWorth } from "./net-worth";

describe("net worth calculations", () => {
  it("adds account and investment balances and subtracts credit used", () => {
    expect(
      calculateNetWorth({
        accountBalance: 2949.72,
        investmentBalance: 6500,
        creditUsed: 1340.67,
      }),
    ).toEqual({
      accountBalance: 2949.72,
      investmentBalance: 6500,
      creditUsed: 1340.67,
      netWorth: 8109.05,
    });
  });

  it("returns the absolute and percentage change from the previous snapshot", () => {
    expect(compareNetWorth(1000, 800)).toEqual({
      difference: 200,
      percentage: 25,
      direction: "increase",
    });
  });

  it("does not invent a percentage when the previous snapshot is zero", () => {
    expect(compareNetWorth(100, 0)).toEqual({
      difference: 100,
      percentage: null,
      direction: "increase",
    });
  });
});
