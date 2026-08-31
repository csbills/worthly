"use server";

import type { CurrencyCode } from "pluggy-sdk";

import {
  type BrapiPrice,
  fetchBrapiMarketHistory,
  fetchBrapiPrices,
} from "@/lib/brapi";
import {
  type CryptoHistoryPoint,
  mapMarketChartToHistory,
} from "@/lib/crypto-market";
import {
  type CryptoOrder,
  type CryptoOrderView,
  calculateCryptoPosition,
} from "@/lib/crypto-orders";
import {
  getMarketAssetClassification,
  type ManualMarketAssetType,
} from "@/lib/market-assets";
import { prisma } from "@/lib/prisma";

const marketHistoryDays = 90;

const manualMarketCurrencyCodes = [
  "BRL",
] as const satisfies readonly CurrencyCode[];

export type ManualMarketCurrency = (typeof manualMarketCurrencyCodes)[number];
export type ManualMarketOrder = CryptoOrderView;

export type ManualMarketAsset = {
  id: string;
  symbol: string;
  name: string;
  assetType: ManualMarketAssetType;
  categoryKey: "EQUITY" | "ETF";
  subtype: "STOCK" | "REAL_ESTATE_FUND" | "ETF";
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
  balance: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  amountProfitPercentage: number | null;
  currencyCode: ManualMarketCurrency;
  priceSource: "Brapi" | "Último preço salvo" | null;
  priceUpdatedAt: string | null;
  history: CryptoHistoryPoint[];
  orders: ManualMarketOrder[];
  realizedProfit: number;
  orderCount: number;
  updatedAt: string;
};

export type ManualMarketAssetsResult = {
  assets: ManualMarketAsset[];
  error: string | null;
};

type StoredManualMarketAsset = {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
  orders?: StoredManualMarketOrder[];
};

type StoredManualMarketOrder = {
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
  price?: BrapiPrice;
  history: CryptoHistoryPoint[];
};

function isManualMarketAssetType(
  value: string,
): value is ManualMarketAssetType {
  return value === "STOCK" || value === "FII" || value === "ETF";
}

function serializeDate(date: Date) {
  return date.toISOString();
}

function getOrderDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toCryptoOrder(order: StoredManualMarketOrder): CryptoOrder {
  return {
    id: order.id,
    side: order.side === "SELL" ? "SELL" : "BUY",
    orderDate: getOrderDateKey(order.orderDate),
    total: order.total,
    brokerFee: order.brokerFee,
    unitPrice: order.unitPrice,
    createdAt: serializeDate(order.createdAt),
  };
}

function getAssetOrders(asset: StoredManualMarketAsset): CryptoOrder[] {
  return asset.orders?.map(toCryptoOrder) ?? [];
}

function getAssetPosition(asset: StoredManualMarketAsset) {
  const orders = getAssetOrders(asset);

  if (orders.length === 0) {
    return {
      quantity: asset.quantity,
      amountOriginal:
        asset.averagePrice === null ? 0 : asset.quantity * asset.averagePrice,
      averagePrice: asset.averagePrice,
      realizedProfit: 0,
      totalBought: 0,
      totalSold: 0,
    };
  }

  return calculateCryptoPosition(orders);
}

function serializeOrder(order: StoredManualMarketOrder): ManualMarketOrder {
  return {
    id: order.id,
    side: order.side === "SELL" ? "SELL" : "BUY",
    orderDate: getOrderDateKey(order.orderDate),
    total: order.total,
    brokerFee: order.brokerFee,
    unitPrice: order.unitPrice,
    quantity: (order.total - order.brokerFee) / order.unitPrice,
    createdAt: serializeDate(order.createdAt),
    updatedAt: serializeDate(order.updatedAt),
  };
}

function serializeAsset(
  asset: StoredManualMarketAsset,
  liveMarketData: LiveMarketData,
): ManualMarketAsset | null {
  if (!isManualMarketAssetType(asset.assetType)) {
    return null;
  }

  const classification = getMarketAssetClassification(asset.assetType);
  const orders = asset.orders ?? [];
  const position = getAssetPosition(asset);
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
  const priceSource =
    liveMarketData.price !== undefined
      ? "Brapi"
      : currentPrice === null
        ? null
        : "Último preço salvo";
  const priceUpdatedAt =
    liveMarketData.price !== undefined
      ? liveMarketData.price.updatedAt
      : currentPrice === null
        ? null
        : serializeDate(asset.updatedAt);

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    assetType: asset.assetType,
    categoryKey: classification.categoryKey,
    subtype: classification.subtype,
    quantity: position.quantity,
    averagePrice: position.averagePrice,
    currentPrice,
    balance,
    amountOriginal,
    amountProfit,
    amountProfitPercentage,
    currencyCode: manualMarketCurrencyCodes.includes(
      asset.currencyCode as ManualMarketCurrency,
    )
      ? (asset.currencyCode as ManualMarketCurrency)
      : "BRL",
    priceSource,
    priceUpdatedAt,
    history: liveMarketData.history,
    orders: orders.map(serializeOrder),
    realizedProfit: position.realizedProfit,
    orderCount: orders.length,
    updatedAt: serializeDate(asset.updatedAt),
  };
}

function getLiveMarketData(assets: StoredManualMarketAsset[]) {
  const groupedSymbols = new Map<ManualMarketAssetType, string[]>();

  for (const asset of assets) {
    if (!isManualMarketAssetType(asset.assetType)) {
      continue;
    }

    const symbols = groupedSymbols.get(asset.assetType) ?? [];
    symbols.push(asset.symbol);
    groupedSymbols.set(asset.assetType, symbols);
  }

  return Promise.all([
    Promise.allSettled(
      [...groupedSymbols.entries()].map(async ([assetType, symbols]) => ({
        assetType,
        prices: await fetchBrapiPrices(symbols, assetType),
      })),
    ),
    Promise.allSettled(
      [...groupedSymbols.entries()].map(async ([assetType, symbols]) => ({
        assetType,
        histories: await fetchBrapiMarketHistory(
          symbols,
          assetType,
          marketHistoryDays,
        ),
      })),
    ),
  ]).then(([priceResults, historyResults]) => {
    const pricesBySymbol = new Map<string, BrapiPrice>();
    const historiesBySymbol = new Map<string, CryptoHistoryPoint[]>();

    for (const result of priceResults) {
      if (result.status !== "fulfilled") {
        continue;
      }

      for (const [symbol, price] of Object.entries(result.value.prices)) {
        pricesBySymbol.set(symbol, price);
      }
    }

    for (const result of historyResults) {
      if (result.status !== "fulfilled") {
        continue;
      }

      for (const [symbol, prices] of Object.entries(result.value.histories)) {
        historiesBySymbol.set(symbol, mapMarketChartToHistory(prices, 1));
      }
    }

    return new Map(
      assets.map((asset) => [
        asset.id,
        {
          price: pricesBySymbol.get(asset.symbol),
          history: (historiesBySymbol.get(asset.symbol) ?? []).map((point) => ({
            ...point,
            balance: point.price * getAssetPosition(asset).quantity,
          })),
        },
      ]),
    );
  });
}

export async function getManualMarketAssets(): Promise<ManualMarketAssetsResult> {
  try {
    const assets = await prisma.manualMarketAsset.findMany({
      orderBy: [{ assetType: "asc" }, { symbol: "asc" }],
      include: {
        orders: {
          orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    const liveMarketData = await getLiveMarketData(assets);

    return {
      assets: assets.flatMap((asset) => {
        const serialized = serializeAsset(
          asset,
          liveMarketData.get(asset.id) ?? { history: [] },
        );

        return serialized ? [serialized] : [];
      }),
      error: null,
    };
  } catch {
    return {
      assets: [],
      error: "Não foi possível carregar os ativos manuais de mercado.",
    };
  }
}
