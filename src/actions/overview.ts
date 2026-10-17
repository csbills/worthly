"use server";

import { getConnectedAccounts } from "@/actions/pluggy";
import { verifySession } from "@/lib/auth/dal";
import { getPluggyClient } from "@/lib/pluggy";
import {
  type CashFlowSummary,
  type CashFlowTransactionInput,
  summarizeCashFlow,
} from "../lib/cash-flow";
import {
  type OverviewBalances,
  summarizeOverviewBalances,
} from "../lib/overview-balances";
import {
  getConnectedAccountNumbers,
  getInternalTransferTransactionIds,
  isExcludedFromFinancialReporting,
  type ReportingTransaction,
  withReportingAccountContext,
} from "../lib/transaction-reporting";

const timeZone = "America/Sao_Paulo";

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
  cashFlow: {
    current: CashFlowSummary;
    previous: CashFlowSummary;
  };
  overviewBalances: OverviewBalances;
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
  transactions: ReportingTransaction[],
  currentMonth: Month,
  previousMonth: Month,
  currentElapsedDays: number,
  internalTransferIds: ReadonlySet<string>,
  connectedAccountNumbers: ReadonlySet<string>,
) {
  const currentDailyAmounts = new Map<number, number>();
  const previousDailyAmounts = new Map<number, number>();
  const currentCashFlowTransactions: CashFlowTransactionInput[] = [];
  const previousCashFlowTransactions: CashFlowTransactionInput[] = [];

  for (const transaction of transactions) {
    if (
      isExcludedFromFinancialReporting(
        transaction,
        internalTransferIds,
        connectedAccountNumbers,
      ) ||
      !Number.isFinite(transaction.amount)
    ) {
      continue;
    }

    const date = getDateParts(transaction.date);
    const monthKey = `${date.year}-${pad(date.month)}`;
    const amount = Math.abs(transaction.amount);

    if (monthKey === currentMonth.key && date.day <= currentElapsedDays) {
      if (transaction.type === "DEBIT") {
        addDailyAmount(currentDailyAmounts, date.day, amount);
      }
      currentCashFlowTransactions.push({
        type: transaction.type,
        amount: transaction.amount,
      });
    }

    if (monthKey === previousMonth.key) {
      if (transaction.type === "DEBIT") {
        addDailyAmount(previousDailyAmounts, date.day, amount);
      }
      previousCashFlowTransactions.push({
        type: transaction.type,
        amount: transaction.amount,
      });
    }
  }

  return {
    currentDailyAmounts,
    previousDailyAmounts,
    currentCashFlow: summarizeCashFlow(currentCashFlowTransactions),
    previousCashFlow: summarizeCashFlow(previousCashFlowTransactions),
  };
}

export async function getSpendingPace(): Promise<SpendingPaceResult> {
  await verifySession();

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
  const emptyCashFlow = {
    current: summarizeCashFlow([]),
    previous: summarizeCashFlow([]),
  };
  const accountResult = await getConnectedAccounts();
  const overviewBalances = summarizeOverviewBalances(accountResult.accounts);

  if (accountResult.accounts.length === 0) {
    return {
      ...emptyMonths,
      cashFlow: emptyCashFlow,
      overviewBalances,
      accountCount: 0,
      points: [],
      error: accountResult.error,
    };
  }

  try {
    const client = await getPluggyClient();
    const transactionResults = await Promise.allSettled(
      accountResult.accounts.map(async (account) => {
        const transactions = await client.fetchAllTransactions(account.id, {
          dateFrom: previousMonth.dateFrom,
          dateTo: currentMonth.dateTo,
        });

        return transactions.map((transaction) =>
          withReportingAccountContext(transaction, account),
        );
      }),
    );
    const transactions = transactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const internalTransferIds = getInternalTransferTransactionIds(transactions);
    const connectedAccountNumbers = getConnectedAccountNumbers(
      accountResult.accounts,
    );
    const {
      currentDailyAmounts,
      previousDailyAmounts,
      currentCashFlow,
      previousCashFlow,
    } = collectMonthlyAmounts(
      transactions,
      currentMonth,
      previousMonth,
      currentDate.day,
      internalTransferIds,
      connectedAccountNumbers,
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
      cashFlow: {
        current: currentCashFlow,
        previous: previousCashFlow,
      },
      overviewBalances,
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
      cashFlow: emptyCashFlow,
      overviewBalances,
      accountCount: accountResult.accounts.length,
      points: [],
      error: "Não foi possível consultar as transações na Pluggy.",
    };
  }
}
