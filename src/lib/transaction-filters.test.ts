import { describe, expect, it } from "vitest";

import {
  defaultTransactionFilters,
  filterAndSortTransactions,
  normalizeTransactionFilters,
  resolveTransactionPeriod,
} from "./transaction-filters";

const transactions = [
  {
    id: "hidden-transfer",
    date: "2026-08-08T12:00:00.000Z",
    accountId: "account-a",
    type: "CREDIT" as const,
    categoryLabel: "Transferências",
    description: "Transferência recebida",
    bankName: "Nubank",
    accountName: "Conta corrente",
    excludeFromSummary: true,
  },
  {
    id: "market",
    date: "2026-08-10T12:00:00.000Z",
    accountId: "account-a",
    type: "DEBIT" as const,
    categoryLabel: "Supermercado",
    description: "Compra no mercado",
    bankName: "Nubank",
    accountName: "Conta corrente",
    excludeFromSummary: false,
  },
  {
    id: "salary",
    date: "2026-08-15T12:00:00.000Z",
    accountId: "account-b",
    type: "CREDIT" as const,
    categoryLabel: "Salário",
    description: "Salário mensal",
    bankName: "Inter",
    accountName: "Conta principal",
    excludeFromSummary: false,
  },
];

describe("transaction filters", () => {
  it("normalizes unsupported values and hides excluded transactions by default", () => {
    expect(
      normalizeTransactionFilters({
        period: "not-a-period",
        type: "not-a-type",
        sort: "not-a-sort",
        hidden: "false",
      }),
    ).toEqual(defaultTransactionFilters);

    expect(
      filterAndSortTransactions(transactions, defaultTransactionFilters).map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["salary", "market"]);
  });

  it("combines account, type, category, search and oldest-first filters", () => {
    const filters = normalizeTransactionFilters({
      account: "account-a",
      type: "DEBIT",
      category: "Supermercado",
      search: "mercado",
      sort: "oldest",
      hidden: "1",
    });

    expect(
      filterAndSortTransactions(transactions, filters).map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["market"]);
  });

  it("resolves preset periods using the São Paulo calendar", () => {
    const now = new Date("2026-08-29T15:00:00-03:00");

    expect(resolveTransactionPeriod("current-month", now)).toMatchObject({
      key: "current-month",
      dateFrom: "2026-08-01",
      dateTo: "2026-09-01",
      label: "Este mês",
    });

    expect(resolveTransactionPeriod("previous-month", now)).toMatchObject({
      key: "previous-month",
      dateFrom: "2026-07-01",
      dateTo: "2026-08-01",
      label: "Mês passado",
    });
  });
});
