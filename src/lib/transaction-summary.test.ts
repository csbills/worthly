import { describe, expect, it } from "vitest";

import { summarizeTransactions } from "./transaction-summary";

describe("summarizeTransactions", () => {
  it("keeps excluded transactions in the count but outside financial totals", () => {
    expect(
      summarizeTransactions([
        { type: "CREDIT", amount: 1000, excludeFromSummary: true },
        { type: "CREDIT", amount: 100 },
        { type: "DEBIT", amount: 300, excludeFromSummary: true },
        { type: "DEBIT", amount: 20 },
      ]),
    ).toEqual({
      total: 4,
      receipts: 100,
      expenses: 20,
      balance: 80,
    });
  });

  it("counts transactions and separates receipts from expenses", () => {
    expect(
      summarizeTransactions([
        { type: "CREDIT", amount: 178.94 },
        { type: "DEBIT", amount: 75.9 },
        { type: "DEBIT", amount: -19.1 },
      ]),
    ).toEqual({
      total: 3,
      receipts: 178.94,
      expenses: 95,
      balance: 83.94,
    });
  });

  it("returns zeroed totals when there are no transactions", () => {
    expect(summarizeTransactions([])).toEqual({
      total: 0,
      receipts: 0,
      expenses: 0,
      balance: 0,
    });
  });
});
