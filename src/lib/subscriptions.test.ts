import { describe, expect, it } from "vitest";

import {
  detectSubscriptions,
  merchantKey,
  type RecurringInputTransaction,
} from "./subscriptions";

let counter = 0;
function debit(
  date: string,
  description: string,
  amount: number,
  extra: Partial<RecurringInputTransaction> = {},
): RecurringInputTransaction {
  counter += 1;
  return {
    id: `t${counter}`,
    date: `${date}T12:00:00.000Z`,
    description,
    amount,
    type: "DEBIT",
    categoryLabel: "Streaming",
    excludeFromSummary: false,
    currencyCode: "BRL",
    ...extra,
  };
}

const now = new Date("2026-11-05T12:00:00.000Z");

describe("subscription detection", () => {
  it("normalizes merchant names", () => {
    expect(merchantKey("PAG*Netflix.com 12345 | São Paulo")).toBe("netflix");
    expect(merchantKey("Spotify Brasil Ltda")).toBe("spotify");
  });

  it("finds monthly charges with a stable amount and projects the next one", () => {
    const [netflix] = detectSubscriptions(
      [
        debit("2026-08-12", "Netflix.com", 55.9),
        debit("2026-09-12", "NETFLIX.COM", 55.9),
        debit("2026-10-12", "Netflix.com", 59.9),
        debit("2026-10-20", "Padaria", 12),
        debit("2026-10-27", "Padaria", 40),
      ],
      now,
    );

    expect(netflix).toMatchObject({
      key: "netflix",
      cadence: "monthly",
      occurrences: 3,
      lastAmount: 59.9,
      monthlyCost: 59.9,
      nextDate: "2026-11-12",
      priceChange: 0.072,
      isNew: false,
    });
  });

  it("detects yearly plans and spreads them per month", () => {
    const [annual] = detectSubscriptions(
      [
        debit("2025-11-01", "Amazon Prime", 166.8),
        debit("2026-10-30", "Amazon Prime", 166.8),
      ],
      now,
    );

    expect(annual).toMatchObject({ cadence: "yearly", monthlyCost: 13.9 });
  });

  it("ignores credits, excluded rows, irregular amounts and cancelled ones", () => {
    expect(
      detectSubscriptions(
        [
          debit("2026-09-01", "Salario", 5000, { type: "CREDIT" }),
          debit("2026-10-01", "Salario", 5000, { type: "CREDIT" }),
          debit("2026-09-05", "Transferencia", 100, {
            excludeFromSummary: true,
          }),
          debit("2026-10-05", "Transferencia", 100, {
            excludeFromSummary: true,
          }),
          debit("2026-09-10", "Mercado Bom", 80),
          debit("2026-10-10", "Mercado Bom", 420),
          debit("2026-09-15", "Loja TV 3/10", 400, { installment: true }),
          debit("2026-10-15", "Loja TV 4/10", 400, { installment: true }),
          debit("2026-03-01", "Academia Velha", 99),
          debit("2026-04-01", "Academia Velha", 99),
        ],
        now,
      ),
    ).toEqual([]);
  });

  it("flags charges that just started", () => {
    const [fresh] = detectSubscriptions(
      [debit("2026-10-01", "Max", 39.9), debit("2026-10-31", "Max", 39.9)],
      now,
    );

    expect(fresh?.isNew).toBe(true);
  });
});
