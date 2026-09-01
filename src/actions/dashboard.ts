"use server";

import { calculateNetWorth, type NetWorthBreakdown } from "../lib/net-worth";
import type { OverviewBalances } from "../lib/overview-balances";
import { prisma } from "../lib/prisma";
import { getSpendingPace, type SpendingPaceResult } from "./overview";
import { getPortfolio, type PortfolioResult } from "./portfolio";

const timeZone = "America/Sao_Paulo";
const historyLimit = 90;
const currencyCode = "BRL" as const;

export type NetWorthHistoryPoint = {
  date: string;
  netWorth: number;
};

export type NetWorthResult = {
  currencyCode: typeof currencyCode;
  current: NetWorthBreakdown | null;
  history: NetWorthHistoryPoint[];
  error: string | null;
};

export type DashboardOverviewResult = SpendingPaceResult & {
  netWorth: NetWorthResult;
};

function getDatePart(date: Date, type: "year" | "month" | "day") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .find((part) => part.type === type)?.value;
}

function getSnapshotDate(date = new Date()) {
  const year = getDatePart(date, "year");
  const month = getDatePart(date, "month");
  const day = getDatePart(date, "day");

  if (!year || !month || !day) {
    throw new Error("Não foi possível determinar a data do patrimônio.");
  }

  return `${year}-${month}-${day}`;
}

function combineErrors(...errors: Array<string | null | undefined>) {
  return (
    [
      ...new Set(errors.filter((error): error is string => Boolean(error))),
    ].join(" ") || null
  );
}

function getCreditUsed(overviewBalances: OverviewBalances) {
  if (
    overviewBalances.totalCreditLimit === null ||
    overviewBalances.totalAvailableCredit === null
  ) {
    return null;
  }

  return Math.max(
    0,
    overviewBalances.totalCreditLimit - overviewBalances.totalAvailableCredit,
  );
}

function getInvestmentBalance(portfolio: PortfolioResult) {
  return (
    portfolio.currencies.find(
      (currency) => currency.currencyCode === currencyCode,
    )?.balance ?? 0
  );
}

async function getNetWorthResult(
  overviewBalances: OverviewBalances,
  portfolio: PortfolioResult,
  sourceError: string | null,
): Promise<NetWorthResult> {
  const emptyResult = {
    currencyCode,
    current: null,
    history: [],
  } satisfies Omit<NetWorthResult, "error">;

  const error = combineErrors(sourceError, portfolio.error);

  if (error) {
    return { ...emptyResult, error };
  }

  const creditUsed = getCreditUsed(overviewBalances);

  if (creditUsed === null) {
    return {
      ...emptyResult,
      error:
        "Não foi possível calcular o patrimônio líquido porque o uso dos cartões não foi informado.",
    };
  }

  const current = calculateNetWorth({
    accountBalance:
      overviewBalances.accountCurrencyCode === currencyCode
        ? overviewBalances.totalAccountBalance
        : 0,
    investmentBalance: getInvestmentBalance(portfolio),
    creditUsed:
      overviewBalances.creditCurrencyCode === currencyCode ? creditUsed : 0,
  });
  let history: NetWorthHistoryPoint[] = [];
  let historyError: string | null = null;

  try {
    const snapshotDate = getSnapshotDate();

    await prisma.netWorthSnapshot.upsert({
      where: { snapshotDate },
      create: {
        snapshotDate,
        currencyCode,
        accountBalance: current.accountBalance,
        investmentBalance: current.investmentBalance,
        creditUsed: current.creditUsed,
        netWorth: current.netWorth,
      },
      update: {
        capturedAt: new Date(),
        currencyCode,
        accountBalance: current.accountBalance,
        investmentBalance: current.investmentBalance,
        creditUsed: current.creditUsed,
        netWorth: current.netWorth,
      },
    });
  } catch {
    historyError =
      "Patrimônio líquido calculado, mas não foi possível salvar o histórico de evolução.";
  }

  try {
    const snapshots = await prisma.netWorthSnapshot.findMany({
      orderBy: { snapshotDate: "desc" },
      take: historyLimit,
      select: {
        snapshotDate: true,
        netWorth: true,
      },
    });

    history = snapshots
      .map((snapshot) => ({
        date: snapshot.snapshotDate,
        netWorth: snapshot.netWorth,
      }))
      .reverse();
  } catch {
    historyError = combineErrors(
      historyError,
      "Não foi possível carregar o histórico de evolução do patrimônio.",
    );
  }

  return { currencyCode, current, history, error: historyError };
}

export async function getDashboardOverview(): Promise<DashboardOverviewResult> {
  const [spendingPace, portfolio] = await Promise.all([
    getSpendingPace(),
    getPortfolio(),
  ]);
  const netWorth = await getNetWorthResult(
    spendingPace.overviewBalances,
    portfolio,
    spendingPace.error,
  );

  return {
    ...spendingPace,
    error: combineErrors(spendingPace.error, portfolio.error, netWorth.error),
    netWorth,
  };
}
