import { describe, expect, it } from "vitest";

import { getSpendingComparison } from "./spending-comparison";

describe("getSpendingComparison", () => {
  it("uses the difference between the current and previous totals", () => {
    expect(getSpendingComparison(9341.6, 6677.58)).toEqual({
      difference: 2664.02,
      isAbovePrevious: true,
      label: "acima",
      percentage: 39.9,
    });
  });

  it("keeps the comparison amount positive when the current total is lower", () => {
    expect(getSpendingComparison(400, 1000)).toEqual({
      difference: 600,
      isAbovePrevious: false,
      label: "abaixo",
      percentage: 60,
    });
  });

  it("handles equal totals and a previous zero total", () => {
    expect(getSpendingComparison(0, 0)).toEqual({
      difference: 0,
      isAbovePrevious: false,
      label: "igual",
      percentage: 0,
    });

    expect(getSpendingComparison(100, 0)).toEqual({
      difference: 100,
      isAbovePrevious: true,
      label: "acima",
      percentage: null,
    });
  });
});
