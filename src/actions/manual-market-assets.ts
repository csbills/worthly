"use server";

import type { CurrencyCode } from "pluggy-sdk";
import { verifySession } from "@/lib/auth/dal";
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
import { fetchYahooMarketData, type YahooPrice } from "@/lib/yahoo-finance";

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
  priceSource: "Yahoo Finance" | "Último preço salvo" | null;
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
  price?: YahooPrice;
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
      ? "Yahoo Finance"
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

async function getLiveMarketData(assets: StoredManualMarketAsset[]) {
  const symbols = assets
    .filter((asset) => isManualMarketAssetType(asset.assetType))
    .map((asset) => asset.symbol);
  const marketData = await fetchYahooMarketData(symbols, marketHistoryDays);

  return new Map(
    assets.map((asset) => {
      const data = marketData[asset.symbol];

      return [
        asset.id,
        {
          price: data?.price,
          history: mapMarketChartToHistory(
            data?.history ?? [],
            getAssetPosition(asset).quantity,
          ),
        },
      ];
    }),
  );
}

export async function getManualMarketAssets(): Promise<ManualMarketAssetsResult> {
  await verifySession();

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
