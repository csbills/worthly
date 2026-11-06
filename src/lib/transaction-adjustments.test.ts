import { describe, expect, it } from "vitest";

import {
  applyTransactionAdjustments,
  createTransactionAdjustments,
  emptyTransactionAdjustments,
  findMatchingRule,
  getAdjustedCategoryId,
  isIgnoredTransaction,
  normalizeRulePattern,
} from "./transaction-adjustments";

describe("transaction adjustments", () => {
  const adjustments = createTransactionAdjustments({
    overrides: [
      {
        transactionId: "tx-override",
        categoryId: "11010000",
        note: "Jantar",
        ignored: false,
      },
      {
        transactionId: "tx-ignored",
        categoryId: null,
        note: null,
        ignored: true,
      },
    ],
    rules: [
      { id: "rule-uber", pattern: "uber", categoryId: "19050000" },
      {
        id: "rule-padaria",
        pattern: "Padaria São João",
        categoryId: "11000000",
      },
    ],
  });

  it("prefers the manual category over rules and Pluggy", () => {
    expect(
      getAdjustedCategoryId(
        { id: "tx-override", description: "UBER TRIP", categoryId: "05000000" },
        adjustments,
      ),
    ).toBe("11010000");
  });

  it("applies the first matching rule, ignoring case and accents", () => {
    expect(
      getAdjustedCategoryId(
        {
          id: "tx-a",
          description: "PADARIA SAO JOAO LTDA",
          categoryId: "99999999",
        },
        adjustments,
      ),
    ).toBe("11000000");
    expect(
      findMatchingRule("Pagamento *Uber* Trip", adjustments.rules)?.id,
    ).toBe("rule-uber");
  });

  it("keeps the Pluggy category when nothing matches", () => {
    expect(
      getAdjustedCategoryId(
        { id: "tx-b", description: "Mercado", categoryId: "10000000" },
        adjustments,
      ),
    ).toBe("10000000");
    expect(
      getAdjustedCategoryId(
        { id: "tx-b", description: null, categoryId: null },
        emptyTransactionAdjustments,
      ),
    ).toBeNull();
  });

  it("reports ignored transactions", () => {
    expect(isIgnoredTransaction("tx-ignored", adjustments)).toBe(true);
    expect(isIgnoredTransaction("tx-override", adjustments)).toBe(false);
    expect(isIgnoredTransaction("unknown", adjustments)).toBe(false);
  });

  it("normalizes rule patterns and rejects ones too short to be useful", () => {
    expect(normalizeRulePattern("  Pão de Açúcar  ")).toBe("pao de acucar");
    expect(normalizeRulePattern("a")).toBeNull();
    expect(normalizeRulePattern("   ")).toBeNull();
  });
  it("prepares Pluggy transactions for reports", () => {
    const result = applyTransactionAdjustments(
      [
        {
          id: "tx-override",
          description: "x",
          categoryId: "05000000",
          category: "Transfer",
        },
        {
          id: "tx-ignored",
          description: "y",
          categoryId: null,
          category: null,
        },
        {
          id: "tx-c",
          description: "Uber *trip",
          categoryId: null,
          category: "Other",
        },
        {
          id: "tx-d",
          description: "Mercado",
          categoryId: "10000000",
          category: "Groceries",
        },
      ],
      adjustments,
    );

    expect(result).toEqual([
      {
        id: "tx-override",
        description: "x",
        categoryId: "11010000",
        category: null,
      },
      {
        id: "tx-c",
        description: "Uber *trip",
        categoryId: "19050000",
        category: null,
      },
      {
        id: "tx-d",
        description: "Mercado",
        categoryId: "10000000",
        category: "Groceries",
      },
    ]);
  });
});
