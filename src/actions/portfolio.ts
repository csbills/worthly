"use server";

import { verifySession } from "@/lib/auth/dal";
import {
  buildPortfolioAssets,
  buildPortfolioSnapshotData,
  type PortfolioCurrencySummary,
  type PortfolioHistoryPoint,
  summarizePortfolioAssets,
} from "../lib/portfolio";
import { prisma } from "../lib/prisma";
import { getInvestments } from "./investments";
import { getManualCryptoAssets } from "./manual-crypto-assets";
import { getManualMarketAssets } from "./manual-market-assets";

const timeZone = "America/Sao_Paulo";
const historyLimit = 90;

export type PortfolioCurrencyResult = PortfolioCurrencySummary & {
  history: PortfolioHistoryPoint[];
};

export type PortfolioResult = {
  itemCount: number;
  manualAssetCount: number;
  manualCryptoAssetCount: number;
  manualMarketAssetCount: number;
  currencies: PortfolioCurrencyResult[];
  error: string | null;
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
    throw new Error("Não foi possível determinar a data do snapshot.");
  }

  return `${year}-${month}-${day}`;
}

function combineErrors(...errors: Array<string | null | undefined>) {
  const messages = errors.filter((error): error is string =>
    Boolean(error?.trim()),
  );

  return messages.length > 0 ? messages.join(" ") : null;
}

async function persistPortfolioSnapshots(
  currencies: PortfolioCurrencySummary[],
) {
  const snapshots = buildPortfolioSnapshotData(currencies, getSnapshotDate());

  if (snapshots.length === 0) {
    return;
  }

  await prisma.$transaction(
    snapshots.map((snapshot) =>
      prisma.portfolioSnapshot.upsert({
        where: {
          snapshotDate_currencyCode: {
            snapshotDate: snapshot.snapshotDate,
            currencyCode: snapshot.currencyCode,
          },
        },
        create: {
          snapshotDate: snapshot.snapshotDate,
          capturedAt: new Date(),
          currencyCode: snapshot.currencyCode,
          balance: snapshot.balance,
          amountOriginal: snapshot.amountOriginal,
          amountProfit: snapshot.amountProfit,
          categories: {
            create: snapshot.categories,
          },
        },
        update: {
          capturedAt: new Date(),
          balance: snapshot.balance,
          amountOriginal: snapshot.amountOriginal,
          amountProfit: snapshot.amountProfit,
          categories: {
            deleteMany: {},
            create: snapshot.categories,
          },
        },
      }),
    ),
  );
}

async function getPortfolioHistory(currencies: PortfolioCurrencySummary[]) {
  const historyEntries = await Promise.all(
    currencies.map(async (currency) => {
      const snapshots = await prisma.portfolioSnapshot.findMany({
        where: { currencyCode: currency.currencyCode },
        orderBy: { snapshotDate: "desc" },
        take: historyLimit,
        select: {
          snapshotDate: true,
          balance: true,
          amountOriginal: true,
          amountProfit: true,
        },
      });

      return [
        currency.currencyCode,
        snapshots
          .map((snapshot) => ({
            date: snapshot.snapshotDate,
            balance: snapshot.balance,
            amountOriginal: snapshot.amountOriginal,
            amountProfit: snapshot.amountProfit,
          }))
          .reverse(),
      ] as const;
    }),
  );

  return new Map(historyEntries);
}

export async function getPortfolio(): Promise<PortfolioResult> {
  await verifySession();

  const [investmentsResult, manualCryptoResult, manualMarketResult] =
    await Promise.all([
      getInvestments(),
      getManualCryptoAssets(),
      getManualMarketAssets(),
    ]);
  const assets = buildPortfolioAssets(
    investmentsResult.investments,
    manualCryptoResult.assets,
    manualMarketResult.assets,
  );
  const currencies = summarizePortfolioAssets(assets);
  const sourceError = combineErrors(
    investmentsResult.error,
    manualCryptoResult.error,
    manualMarketResult.error,
  );
  let error = sourceError;

  if (!sourceError) {
    try {
      await persistPortfolioSnapshots(currencies);
    } catch {
      error = combineErrors(
        error,
        "Carteira carregada, mas não foi possível salvar o histórico de evolução.",
      );
    }
  }

  let history = new Map<string, PortfolioHistoryPoint[]>();

  if (currencies.length > 0) {
    try {
      history = await getPortfolioHistory(currencies);
    } catch {
      error = combineErrors(
        error,
        "Não foi possível carregar o histórico de evolução da carteira.",
      );
    }
  }

  return {
    itemCount: investmentsResult.itemCount,
    manualAssetCount:
      manualCryptoResult.assets.length + manualMarketResult.assets.length,
    manualCryptoAssetCount: manualCryptoResult.assets.length,
    manualMarketAssetCount: manualMarketResult.assets.length,
    currencies: currencies.map((currency) => ({
      ...currency,
      history: history.get(currency.currencyCode) ?? [],
    })),
    error,
  };
}
