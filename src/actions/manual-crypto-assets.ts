"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CurrencyCode } from "pluggy-sdk";

import {
  type CoinGeckoPrice,
  fetchCoinGeckoMarketChart,
  fetchCoinGeckoPrices,
} from "@/lib/coingecko";
import { findSupportedCryptoAsset } from "@/lib/crypto-assets";
import {
  type CryptoHistoryPoint,
  calculateCryptoPerformance,
  calculateCryptoPurchase,
  mapMarketChartToHistory,
} from "@/lib/crypto-market";
import { prisma } from "@/lib/prisma";

const investmentsPath = "/investments";

const manualCryptoCurrencyCodes = [
  "BRL",
  "USD",
  "EUR",
] as const satisfies readonly CurrencyCode[];

export type ManualCryptoCurrency = (typeof manualCryptoCurrencyCodes)[number];

export type ManualCryptoAsset = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
  purchaseTotal: number | null;
  brokerFee: number | null;
  purchasePrice: number | null;
  balance: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  amountProfitPercentage: number | null;
  currencyCode: ManualCryptoCurrency;
  coingeckoId: string | null;
  priceSource: "CoinGecko" | "Manual" | "Último preço salvo" | null;
  priceUpdatedAt: string | null;
  history: CryptoHistoryPoint[];
  updatedAt: string;
};

export type ManualCryptoAssetsResult = {
  assets: ManualCryptoAsset[];
  error: string | null;
};

function isManualCryptoCurrency(value: string): value is ManualCryptoCurrency {
  return manualCryptoCurrencyCodes.includes(value as ManualCryptoCurrency);
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function getFormNumber(formData: FormData, name: string) {
  const value = getFormString(formData, name);

  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function serializeDate(date: Date) {
  return date.toISOString();
}

type StoredManualCryptoAsset = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
  currencyCode: string;
  coingeckoId: string | null;
  purchaseTotal: number | null;
  brokerFee: number | null;
  purchasePrice: number | null;
  updatedAt: Date;
};

type LiveMarketData = {
  price?: CoinGeckoPrice;
  history: CryptoHistoryPoint[];
};

type DerivedPurchase = {
  quantity: number;
  averagePrice: number | null;
  purchaseTotal: number | null;
  brokerFee: number | null;
  purchasePrice: number | null;
};

function getDerivedPurchase(asset: StoredManualCryptoAsset): DerivedPurchase {
  if (
    asset.purchaseTotal !== null &&
    asset.purchasePrice !== null &&
    asset.purchaseTotal > 0 &&
    asset.purchasePrice > 0
  ) {
    const purchase = calculateCryptoPurchase({
      purchaseTotal: asset.purchaseTotal,
      brokerFee: asset.brokerFee ?? 0,
      purchasePrice: asset.purchasePrice,
    });

    return {
      quantity: purchase.quantity,
      averagePrice: purchase.averagePrice,
      purchaseTotal: asset.purchaseTotal,
      brokerFee: asset.brokerFee ?? 0,
      purchasePrice: asset.purchasePrice,
    };
  }

  return {
    quantity: asset.quantity,
    averagePrice: asset.averagePrice,
    purchaseTotal: null,
    brokerFee: asset.brokerFee,
    purchasePrice: null,
  };
}

function getAssetMetadata(asset: StoredManualCryptoAsset) {
  const catalogAsset = findSupportedCryptoAsset(
    asset.coingeckoId?.trim() || asset.symbol,
  );

  return {
    symbol: catalogAsset?.symbol ?? asset.symbol,
    name: catalogAsset?.name ?? asset.name,
    coingeckoId: asset.coingeckoId?.trim() || catalogAsset?.coingeckoId || null,
  };
}

function getAssetQuantity(assets: StoredManualCryptoAsset[], assetId: string) {
  const asset = assets.find((candidate) => candidate.id === assetId);

  return asset ? getDerivedPurchase(asset).quantity : 0;
}

function serializeAsset(
  asset: StoredManualCryptoAsset,
  liveMarketData: LiveMarketData,
): ManualCryptoAsset {
  const currencyCode = isManualCryptoCurrency(asset.currencyCode)
    ? asset.currencyCode
    : "BRL";
  const metadata = getAssetMetadata(asset);
  const purchase = getDerivedPurchase(asset);
  const coingeckoId = metadata.coingeckoId;
  const currentPrice = liveMarketData.price?.price ?? asset.currentPrice;
  const performance = calculateCryptoPerformance({
    quantity: purchase.quantity,
    averagePrice: purchase.averagePrice,
    currentPrice,
  });
  const priceSource =
    liveMarketData.price !== undefined
      ? "CoinGecko"
      : currentPrice === null
        ? null
        : coingeckoId
          ? "Último preço salvo"
          : "Manual";
  const priceUpdatedAt =
    liveMarketData.price !== undefined
      ? liveMarketData.price.updatedAt
      : currentPrice === null
        ? null
        : serializeDate(asset.updatedAt);

  return {
    id: asset.id,
    symbol: metadata.symbol,
    name: metadata.name,
    quantity: purchase.quantity,
    averagePrice: purchase.averagePrice,
    currentPrice,
    purchaseTotal: purchase.purchaseTotal,
    brokerFee: purchase.brokerFee,
    purchasePrice: purchase.purchasePrice,
    ...performance,
    currencyCode,
    coingeckoId,
    priceSource,
    priceUpdatedAt,
    history: liveMarketData.history,
    updatedAt: serializeDate(asset.updatedAt),
  };
}

function getCoinGeckoAssetReferences(assets: StoredManualCryptoAsset[]) {
  return assets.flatMap((asset) => {
    const coingeckoId = getAssetMetadata(asset).coingeckoId;

    if (!coingeckoId) {
      return [];
    }

    const currencyCode = isManualCryptoCurrency(asset.currencyCode)
      ? asset.currencyCode
      : "BRL";

    return [{ asset, coingeckoId, currencyCode }];
  });
}

async function getLiveMarketData(assets: StoredManualCryptoAsset[]) {
  const references = getCoinGeckoAssetReferences(assets);
  const pricesByAssetId = new Map<string, CoinGeckoPrice>();
  const historiesByAssetId = new Map<string, CryptoHistoryPoint[]>();
  const groupedIds = new Map<ManualCryptoCurrency, Set<string>>();

  for (const reference of references) {
    const ids = groupedIds.get(reference.currencyCode) ?? new Set<string>();
    ids.add(reference.coingeckoId);
    groupedIds.set(reference.currencyCode, ids);
  }

  const priceResults = await Promise.allSettled(
    [...groupedIds.entries()].map(async ([currencyCode, ids]) => ({
      currencyCode,
      prices: await fetchCoinGeckoPrices([...ids], currencyCode),
    })),
  );

  for (const result of priceResults) {
    if (result.status !== "fulfilled") {
      continue;
    }

    for (const reference of references) {
      if (reference.currencyCode !== result.value.currencyCode) {
        continue;
      }

      const price = result.value.prices[reference.coingeckoId];

      if (price) {
        pricesByAssetId.set(reference.asset.id, price);
      }
    }
  }

  const historyResults = await Promise.allSettled(
    references.map(async (reference) => ({
      assetId: reference.asset.id,
      prices: await fetchCoinGeckoMarketChart(
        reference.coingeckoId,
        reference.currencyCode,
        30,
      ),
    })),
  );

  for (const result of historyResults) {
    if (result.status === "fulfilled") {
      historiesByAssetId.set(
        result.value.assetId,
        mapMarketChartToHistory(
          result.value.prices,
          getAssetQuantity(assets, result.value.assetId),
        ),
      );
    }
  }

  return new Map(
    assets.map((asset) => [
      asset.id,
      {
        price: pricesByAssetId.get(asset.id),
        history: historiesByAssetId.get(asset.id) ?? [],
      },
    ]),
  );
}

export async function getManualCryptoAssets(): Promise<ManualCryptoAssetsResult> {
  try {
    const assets = await prisma.manualCryptoAsset.findMany({
      orderBy: [{ currencyCode: "asc" }, { symbol: "asc" }],
    });
    const liveMarketData = await getLiveMarketData(assets);

    return {
      assets: assets.map((asset) =>
        serializeAsset(asset, liveMarketData.get(asset.id) ?? { history: [] }),
      ),
      error: null,
    };
  } catch {
    return {
      assets: [],
      error: "Não foi possível carregar os criptoativos cadastrados.",
    };
  }
}

export async function saveManualCryptoAsset(
  formData: FormData,
): Promise<never> {
  const assetId = getFormString(formData, "assetId");
  const asset = findSupportedCryptoAsset(assetId);
  const purchaseTotal = getFormNumber(formData, "purchaseTotal");
  const brokerFeeInput = getFormString(formData, "brokerFee");
  const brokerFee = brokerFeeInput ? getFormNumber(formData, "brokerFee") : 0;
  const purchasePrice = getFormNumber(formData, "purchasePrice");

  if (
    !asset ||
    purchaseTotal === null ||
    purchaseTotal <= 0 ||
    brokerFee === null ||
    brokerFee < 0 ||
    brokerFee >= purchaseTotal ||
    purchasePrice === null ||
    purchasePrice <= 0
  ) {
    redirect(`${investmentsPath}?crypto=invalid`);
  }

  const purchase = calculateCryptoPurchase({
    purchaseTotal,
    brokerFee,
    purchasePrice,
  });

  try {
    await prisma.manualCryptoAsset.upsert({
      where: {
        symbol_currencyCode: {
          symbol: asset.symbol,
          currencyCode: "BRL",
        },
      },
      create: {
        symbol: asset.symbol,
        name: asset.name,
        quantity: purchase.quantity,
        averagePrice: purchase.averagePrice,
        currentPrice: null,
        currencyCode: "BRL",
        coingeckoId: asset.coingeckoId,
        purchaseTotal,
        brokerFee,
        purchasePrice,
      },
      update: {
        name: asset.name,
        quantity: purchase.quantity,
        averagePrice: purchase.averagePrice,
        coingeckoId: asset.coingeckoId,
        purchaseTotal,
        brokerFee,
        purchasePrice,
      },
    });
  } catch {
    redirect(`${investmentsPath}?crypto=error`);
  }

  revalidatePath(investmentsPath);
  redirect(`${investmentsPath}?crypto=saved`);
}
