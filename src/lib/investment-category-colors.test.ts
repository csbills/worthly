import type { InvestmentType } from "pluggy-sdk";
import { describe, expect, it } from "vitest";

import { investmentCategoryColors } from "./investment-category-colors";

const investmentTypes: InvestmentType[] = [
  "COE",
  "EQUITY",
  "ETF",
  "FIXED_INCOME",
  "MUTUAL_FUND",
  "OTHER",
  "SECURITY",
];

describe("Investment category colors", () => {
  it("assigns a stable and distinct color to every investment type", () => {
    const colors = investmentTypes.map(
      (investmentType) => investmentCategoryColors[investmentType],
    );

    expect(colors.every(Boolean)).toBe(true);
    expect(new Set(colors).size).toBe(investmentTypes.length);
    expect(investmentCategoryColors.FIXED_INCOME).toBe("#0f766e");
  });
});
