"use server";

import type { CurrencyCode, Transaction } from "pluggy-sdk";

import { getConnectedAccounts } from "@/actions/pluggy";
import { getPluggyClient } from "@/lib/pluggy";
import {
  getTransactionCategory,
  type ResolvedTransactionCategory,
} from "../lib/transaction-category-dictionary";
import { isNonSpendingTransaction } from "../lib/transaction-spending-rules";

const timeZone = "America/Sao_Paulo";
const defaultCurrencyCode: CurrencyCode = "BRL";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type Month = {
  key: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  previousKey: string;
  nextKey: string;
};

type CategoryAccumulator = {
  category: ResolvedTransactionCategory;
  amount: number;
  transactionCount: number;
};

type GroupAccumulator = {
  key: string;
  label: string;
  color: string;
  amount: number;
  transactionCount: number;
  categories: Map<string, CategoryAccumulator>;
};

export type CategorySpendingItem = {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type CategorySpendingGroup = {
  key: string;
  label: string;
  color: string;
  amount: number;
  percentage: number;
  categoryCount: number;
  transactionCount: number;
  categories: CategorySpendingItem[];
};

export type CategorySpendingResult = {
  month: Month & { isCurrent: boolean };
  currencyCode: CurrencyCode;
  total: number;
  transactionCount: number;
  accountCount: number;
  groups: CategorySpendingGroup[];
  error: string | null;
};

function getDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function formatMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(date);

  return `${label.charAt(0).toLocaleUpperCase("pt-BR")}${label.slice(1)}`;
}

function createMonth(year: number, month: number): Month {
  const start = new Date(Date.UTC(year, month - 1, 1, 12));
  const normalizedYear = start.getUTCFullYear();
  const normalizedMonth = start.getUTCMonth() + 1;
  const previous = new Date(
    Date.UTC(normalizedYear, normalizedMonth - 2, 1, 12),
  );
  const next = new Date(Date.UTC(normalizedYear, normalizedMonth, 1, 12));

  return {
    key: formatMonthKey(start),
    label: formatMonthLabel(start),
    dateFrom: formatDateOnly(start),
    dateTo: formatDateOnly(next),
    previousKey: formatMonthKey(previous),
    nextKey: formatMonthKey(next),
  };
}

function getCurrentMonth() {
  const currentDate = getDateParts(new Date());
  const currentMonth = createMonth(currentDate.year, currentDate.month);

  return { currentDate, currentMonth };
}

function parseMonthKey(monthKey: string | undefined) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey ?? "");

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return createMonth(year, month);
}

function getMonthIndex(month: Month) {
  const [year, monthNumber] = month.key.split("-").map(Number);
  return year * 12 + monthNumber;
}

function resolveRequestedMonth(
  monthKey: string | undefined,
  currentMonth: Month,
) {
  const requestedMonth = parseMonthKey(monthKey);

  if (
    !requestedMonth ||
    getMonthIndex(requestedMonth) > getMonthIndex(currentMonth)
  ) {
    return currentMonth;
  }

  return requestedMonth;
}

function isTransactionInMonth(
  transaction: Transaction,
  month: Month,
  currentMonth: Month,
  currentDay: number,
) {
  if (Number.isNaN(transaction.date.getTime())) {
    return false;
  }

  const date = getDateParts(transaction.date);

  if (`${date.year}-${pad(date.month)}` !== month.key) {
    return false;
  }

  return month.key !== currentMonth.key || date.day <= currentDay;
}

function getCategoryCurrency(
  transactions: Transaction[],
  accountCurrencyCode: CurrencyCode | undefined,
) {
  return (
    transactions.find((transaction) => transaction.currencyCode)
      ?.currencyCode ??
    accountCurrencyCode ??
    defaultCurrencyCode
  );
}

function buildCategoryGroups(
  transactions: Transaction[],
  month: Month,
  currentMonth: Month,
  currentDay: number,
) {
  const groups = new Map<string, GroupAccumulator>();

  for (const transaction of transactions) {
    if (
      transaction.type !== "DEBIT" ||
      isNonSpendingTransaction(transaction) ||
      !Number.isFinite(transaction.amount) ||
      !isTransactionInMonth(transaction, month, currentMonth, currentDay)
    ) {
      continue;
    }

    const category = getTransactionCategory(
      transaction.categoryId ?? null,
      transaction.category ?? null,
    );
    const amount = Math.abs(transaction.amount);
    let group = groups.get(category.groupId);

    if (!group) {
      group = {
        key: category.groupId,
        label: category.groupLabel,
        color: category.color,
        amount: 0,
        transactionCount: 0,
        categories: new Map(),
      };
      groups.set(category.groupId, group);
    }

    group.amount += amount;
    group.transactionCount += 1;
    const categoryAccumulator = group.categories.get(category.id);

    if (categoryAccumulator) {
      categoryAccumulator.amount += amount;
      categoryAccumulator.transactionCount += 1;
    } else {
      group.categories.set(category.id, {
        category,
        amount,
        transactionCount: 1,
      });
    }
  }

  const total = [...groups.values()].reduce(
    (sum, group) => sum + group.amount,
    0,
  );

  return {
    total,
    transactionCount: [...groups.values()].reduce(
      (sum, group) => sum + group.transactionCount,
      0,
    ),
    groups: [...groups.values()]
      .sort((left, right) => right.amount - left.amount)
      .map((group) => ({
        key: group.key,
        label: group.label,
        color: group.color,
        amount: group.amount,
        percentage: total > 0 ? (group.amount / total) * 100 : 0,
        categoryCount: group.categories.size,
        transactionCount: group.transactionCount,
        categories: [...group.categories.values()]
          .sort((left, right) => right.amount - left.amount)
          .map(({ category, amount, transactionCount }) => ({
            id: category.id,
            label: category.label,
            amount,
            percentage: group.amount > 0 ? (amount / group.amount) * 100 : 0,
            transactionCount,
          })),
      })),
  };
}

function getEmptyResult(
  month: Month,
  isCurrent: boolean,
  accountCount: number,
  error: string | null,
  currencyCode: CurrencyCode = defaultCurrencyCode,
): CategorySpendingResult {
  return {
    month: { ...month, isCurrent },
    currencyCode,
    total: 0,
    transactionCount: 0,
    accountCount,
    groups: [],
    error,
  };
}

export async function getCategorySpending(
  monthKey?: string,
): Promise<CategorySpendingResult> {
  const { currentDate, currentMonth } = getCurrentMonth();
  const month = resolveRequestedMonth(monthKey, currentMonth);
  const isCurrent = month.key === currentMonth.key;
  const accountResult = await getConnectedAccounts();
  const accountCurrencyCode = accountResult.accounts[0]?.currencyCode;

  if (accountResult.accounts.length === 0) {
    return getEmptyResult(
      month,
      isCurrent,
      0,
      accountResult.error,
      accountCurrencyCode,
    );
  }

  try {
    const client = getPluggyClient();
    const transactionResults = await Promise.allSettled(
      accountResult.accounts.map((account) =>
        client.fetchAllTransactions(account.id, {
          dateFrom: month.dateFrom,
          dateTo: month.dateTo,
        }),
      ),
    );
    const transactions = transactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const summary = buildCategoryGroups(
      transactions,
      month,
      currentMonth,
      currentDate.day,
    );

    return {
      month: { ...month, isCurrent },
      currencyCode: getCategoryCurrency(transactions, accountCurrencyCode),
      total: summary.total,
      transactionCount: summary.transactionCount,
      accountCount: accountResult.accounts.length,
      groups: summary.groups,
      error:
        accountResult.error ||
        (transactionResults.some((result) => result.status === "rejected")
          ? "Não foi possível carregar as transações de uma ou mais contas."
          : null),
    };
  } catch {
    return getEmptyResult(
      month,
      isCurrent,
      accountResult.accounts.length,
      "Não foi possível consultar as transações na Pluggy.",
      accountCurrencyCode,
    );
  }
}
