"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CurrencyCode } from "pluggy-sdk";
import { verifySession } from "@/lib/auth/dal";
import {
  type CoinGeckoPrice,
  fetchCoinGeckoMarketChart,
  fetchCoinGeckoPrices,
} from "@/lib/coingecko";
import { findSupportedCryptoAsset } from "@/lib/crypto-assets";
import {
  type CryptoHistoryPoint,
  calculateCryptoPurchase,
  mapMarketChartToHistory,
} from "@/lib/crypto-market";
import {
  type CryptoOrder,
  type CryptoOrderView,
  type CryptoPosition,
  calculateCryptoPosition,
  sortCryptoOrders,
} from "@/lib/crypto-orders";
import { prisma } from "@/lib/prisma";

const investmentsPath = "/investments";

const manualCryptoCurrencyCodes = [
  "BRL",
  "USD",
  "EUR",
] as const satisfies readonly CurrencyCode[];

export type ManualCryptoCurrency = (typeof manualCryptoCurrencyCodes)[number];

export type ManualCryptoOrder = CryptoOrderView;

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
  orders: ManualCryptoOrder[];
  realizedProfit: number;
  orderCount: number;
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
  createdAt?: Date;
  updatedAt: Date;
  orders?: StoredManualCryptoOrder[];
};

type StoredManualCryptoOrder = {
  id: string;
  side: string;
  orderDate: Date;
  total: number;
  brokerFee: number;
  unitPrice: number;
  quantity: number;
  createdAt: Date;
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

function getOrderDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getAssetOrders(asset: StoredManualCryptoAsset): CryptoOrder[] {
  if (asset.orders && asset.orders.length > 0) {
    return asset.orders.map((order) => ({
      id: order.id,
      side: order.side === "SELL" ? "SELL" : "BUY",
      orderDate: getOrderDateKey(order.orderDate),
      total: order.total,
      brokerFee: order.brokerFee,
      unitPrice: order.unitPrice,
      createdAt: order.createdAt.toISOString(),
    }));
  }

  const purchase = getDerivedPurchase(asset);
  const legacyDate = asset.createdAt ?? asset.updatedAt;

  if (
    purchase.purchaseTotal !== null &&
    purchase.purchasePrice !== null &&
    purchase.quantity > 0
  ) {
    return [
      {
        id: `legacy:${asset.id}`,
        side: "BUY",
        orderDate: getOrderDateKey(legacyDate),
        total: purchase.purchaseTotal,
        brokerFee: purchase.brokerFee ?? 0,
        unitPrice: purchase.purchasePrice,
        createdAt: legacyDate.toISOString(),
      },
    ];
  }

  if (
    asset.quantity > 0 &&
    asset.averagePrice !== null &&
    asset.averagePrice > 0
  ) {
    return [
      {
        id: `legacy:${asset.id}`,
        side: "BUY",
        orderDate: getOrderDateKey(legacyDate),
        total: asset.quantity * asset.averagePrice,
        brokerFee: 0,
        unitPrice: asset.averagePrice,
        createdAt: legacyDate.toISOString(),
      },
    ];
  }

  return [];
}

function getAssetPosition(asset: StoredManualCryptoAsset): CryptoPosition {
  const orders = sortCryptoOrders(getAssetOrders(asset));

  if (orders.length > 0) {
    return calculateCryptoPosition(orders);
  }

  return {
    quantity: asset.quantity,
    amountOriginal:
      asset.purchaseTotal ??
      (asset.averagePrice === null ? 0 : asset.quantity * asset.averagePrice),
    averagePrice: asset.averagePrice,
    realizedProfit: 0,
    totalBought: asset.purchaseTotal ?? 0,
    totalSold: 0,
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

  return asset ? getAssetPosition(asset).quantity : 0;
}

function serializeOrder(
  order: CryptoOrder,
  timestamps: { createdAt: Date; updatedAt: Date },
): ManualCryptoOrder {
  return {
    id: order.id ?? `legacy:${order.orderDate}`,
    side: order.side,
    orderDate: order.orderDate,
    total: order.total,
    brokerFee: order.brokerFee,
    unitPrice: order.unitPrice,
    quantity: (order.total - order.brokerFee) / order.unitPrice,
    createdAt: order.createdAt ?? timestamps.createdAt.toISOString(),
    updatedAt: timestamps.updatedAt.toISOString(),
  };
}

function serializeAsset(
  asset: StoredManualCryptoAsset,
  liveMarketData: LiveMarketData,
): ManualCryptoAsset {
  const currencyCode = isManualCryptoCurrency(asset.currencyCode)
    ? asset.currencyCode
    : "BRL";
  const metadata = getAssetMetadata(asset);
  const orders = sortCryptoOrders(getAssetOrders(asset));
  const position = getAssetPosition(asset);
  const coingeckoId = metadata.coingeckoId;
  const currentPrice = liveMarketData.price?.price ?? asset.currentPrice;
  const balance =
    currentPrice === null ? null : position.quantity * currentPrice;
  const amountOriginal =
    position.amountOriginal > 0 || position.quantity === 0
      ? position.amountOriginal
      : null;
  const amountProfit =
    balance === null
      ? position.realizedProfit === 0
        ? null
        : position.realizedProfit
      : amountOriginal === null
        ? position.realizedProfit === 0
          ? null
          : position.realizedProfit
        : balance - amountOriginal + position.realizedProfit;
  const amountProfitPercentage =
    amountProfit === null || amountOriginal === null || amountOriginal <= 0
      ? null
      : (amountProfit / amountOriginal) * 100;
  const lastOrder = orders.at(-1);
  const singlePurchase = orders.length === 1 && lastOrder?.side === "BUY";
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
    quantity: position.quantity,
    averagePrice: position.averagePrice,
    currentPrice,
    purchaseTotal: singlePurchase ? (lastOrder?.total ?? null) : amountOriginal,
    brokerFee: singlePurchase ? (lastOrder?.brokerFee ?? null) : null,
    purchasePrice: singlePurchase
      ? (lastOrder?.unitPrice ?? null)
      : position.averagePrice,
    balance,
    amountOriginal,
    amountProfit,
    amountProfitPercentage,
    currencyCode,
    coingeckoId,
    priceSource,
    priceUpdatedAt,
    history: liveMarketData.history,
    orders: orders.map((order) =>
      serializeOrder(order, {
        createdAt: asset.createdAt ?? asset.updatedAt,
        updatedAt: asset.updatedAt,
      }),
    ),
    realizedProfit: position.realizedProfit,
    orderCount: orders.length,
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
  await verifySession();

  try {
    const assets = await prisma.manualCryptoAsset.findMany({
      orderBy: [{ currencyCode: "asc" }, { symbol: "asc" }],
      include: {
        orders: {
          orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
        },
      },
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
  await verifySession();

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
