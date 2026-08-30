import { describe, expect, it } from "vitest";

import { summarizeTransactions } from "./transaction-summary";

describe("summarizeTransactions", () => {
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
