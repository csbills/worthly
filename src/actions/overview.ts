"use server";

import type { Transaction } from "pluggy-sdk";

import { getConnectedAccounts } from "@/actions/pluggy";
import { getPluggyClient } from "@/lib/pluggy";

const timeZone = "America/Sao_Paulo";
const investmentCategoryPrefix = "03";
const samePersonTransferCategoryPrefix = "04";
const nonSpendingOperationTypes = new Set([
  "APLIC_FINANCEIRA",
  "RESGATE_APLIC_FINANCEIRA",
  "PORTABILIDADE",
]);

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
  daysInMonth: number;
};

export type SpendingPacePoint = {
  day: number;
  current: number | null;
  previous: number | null;
};

export type SpendingPaceResult = {
  currentMonth: {
    key: string;
    label: string;
    total: number;
    daysInMonth: number;
    elapsedDays: number;
  };
  previousMonth: {
    key: string;
    label: string;
    total: number;
    daysInMonth: number;
  };
  accountCount: number;
  points: SpendingPacePoint[];
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

function createMonth(year: number, month: number): Month {
  const start = new Date(Date.UTC(year, month - 1, 1, 12));
  const normalizedYear = start.getUTCFullYear();
  const normalizedMonth = start.getUTCMonth() + 1;
  const next = new Date(Date.UTC(normalizedYear, normalizedMonth, 1, 12));
  const key = `${normalizedYear}-${pad(normalizedMonth)}`;

  return {
    key,
    label: new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      month: "long",
      year: "numeric",
    }).format(start),
    dateFrom: formatDateOnly(start),
    dateTo: formatDateOnly(next),
    daysInMonth: new Date(
      Date.UTC(normalizedYear, normalizedMonth, 0),
    ).getUTCDate(),
  };
}

function getMonths() {
  const currentDate = getDateParts(new Date());
  const currentMonth = createMonth(currentDate.year, currentDate.month);
  const previousMonth = createMonth(currentDate.year, currentDate.month - 1);

  return {
    currentDate,
    currentMonth,
    previousMonth,
  };
}

function addDailyAmount(
  dailyAmounts: Map<number, number>,
  day: number,
  amount: number,
) {
  dailyAmounts.set(day, (dailyAmounts.get(day) ?? 0) + amount);
}

function getCumulativeTotal(dailyAmounts: Map<number, number>) {
  return [...dailyAmounts.values()].reduce(
    (total, amount) => total + amount,
    0,
  );
}

function normalizeCategory(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim() ?? ""
  );
}

function isNonSpendingTransaction(transaction: Transaction) {
  const categoryId = transaction.categoryId?.trim() ?? "";

  if (
    categoryId.startsWith(investmentCategoryPrefix) ||
    categoryId.startsWith(samePersonTransferCategoryPrefix)
  ) {
    return true;
  }

  const category = normalizeCategory(transaction.category);

  if (
    category === "investments" ||
    category.startsWith("investment ") ||
    category === "same person transfer" ||
    category.startsWith("same person transfer -") ||
    category === "transferencia para mesma pessoa" ||
    category.startsWith("transferencia para mesma pessoa -")
  ) {
    return true;
  }

  return nonSpendingOperationTypes.has(
    transaction.operationType?.trim().toUpperCase() ?? "",
  );
}

function buildPoints(
  currentMonth: Month,
  previousMonth: Month,
  currentElapsedDays: number,
  currentDailyAmounts: Map<number, number>,
  previousDailyAmounts: Map<number, number>,
) {
  const pointCount = Math.max(
    currentMonth.daysInMonth,
    previousMonth.daysInMonth,
  );
  const points: SpendingPacePoint[] = [];
  let currentTotal = 0;
  let previousTotal = 0;

  for (let day = 1; day <= pointCount; day += 1) {
    if (day <= currentElapsedDays) {
      currentTotal += currentDailyAmounts.get(day) ?? 0;
    }

    if (day <= previousMonth.daysInMonth) {
      previousTotal += previousDailyAmounts.get(day) ?? 0;
    }

    points.push({
      day,
      current: day <= currentElapsedDays ? currentTotal : null,
      previous: day <= previousMonth.daysInMonth ? previousTotal : null,
    });
  }

  return points;
}

function collectMonthlyAmounts(
  transactions: Transaction[],
  currentMonth: Month,
  previousMonth: Month,
  currentElapsedDays: number,
) {
  const currentDailyAmounts = new Map<number, number>();
  const previousDailyAmounts = new Map<number, number>();

  for (const transaction of transactions) {
    if (
      transaction.type !== "DEBIT" ||
      isNonSpendingTransaction(transaction) ||
      !Number.isFinite(transaction.amount)
    ) {
      continue;
    }

    const date = getDateParts(transaction.date);
    const monthKey = `${date.year}-${pad(date.month)}`;
    const amount = Math.abs(transaction.amount);

    if (monthKey === currentMonth.key && date.day <= currentElapsedDays) {
      addDailyAmount(currentDailyAmounts, date.day, amount);
    }

    if (monthKey === previousMonth.key) {
      addDailyAmount(previousDailyAmounts, date.day, amount);
    }
  }

  return {
    currentDailyAmounts,
    previousDailyAmounts,
  };
}

export async function getSpendingPace(): Promise<SpendingPaceResult> {
  const { currentDate, currentMonth, previousMonth } = getMonths();
  const emptyMonths = {
    currentMonth: {
      key: currentMonth.key,
      label: currentMonth.label,
      total: 0,
      daysInMonth: currentMonth.daysInMonth,
      elapsedDays: currentDate.day,
    },
    previousMonth: {
      key: previousMonth.key,
      label: previousMonth.label,
      total: 0,
      daysInMonth: previousMonth.daysInMonth,
    },
  };
  const accountResult = await getConnectedAccounts();

  if (accountResult.accounts.length === 0) {
    return {
      ...emptyMonths,
      accountCount: 0,
      points: [],
      error: accountResult.error,
    };
  }

  try {
    const client = getPluggyClient();
    const transactionResults = await Promise.allSettled(
      accountResult.accounts.map((account) =>
        client.fetchAllTransactions(account.id, {
          dateFrom: previousMonth.dateFrom,
          dateTo: currentMonth.dateTo,
        }),
      ),
    );
    const transactions = transactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const { currentDailyAmounts, previousDailyAmounts } = collectMonthlyAmounts(
      transactions,
      currentMonth,
      previousMonth,
      currentDate.day,
    );

    return {
      currentMonth: {
        ...emptyMonths.currentMonth,
        total: getCumulativeTotal(currentDailyAmounts),
      },
      previousMonth: {
        ...emptyMonths.previousMonth,
        total: getCumulativeTotal(previousDailyAmounts),
      },
      accountCount: accountResult.accounts.length,
      points: buildPoints(
        currentMonth,
        previousMonth,
        currentDate.day,
        currentDailyAmounts,
        previousDailyAmounts,
      ),
      error:
        accountResult.error ||
        (transactionResults.some((result) => result.status === "rejected")
          ? "Não foi possível carregar as transações de uma ou mais contas."
          : null),
    };
  } catch {
    return {
      ...emptyMonths,
      accountCount: accountResult.accounts.length,
      points: [],
      error: "Não foi possível consultar as transações na Pluggy.",
    };
  }
}
