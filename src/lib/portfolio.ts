import type { CurrencyCode, InvestmentType } from "pluggy-sdk";
import { getBankLogoPath } from "./bank-assets";
import { getCryptoAssetLogo } from "./crypto-assets";
import type { CryptoHistoryPoint } from "./crypto-market";
import type { CryptoOrderView } from "./crypto-orders";
import { investmentCategoryColors } from "./investment-category-colors";
import { getMarketAssetLogo } from "./market-asset-logos";

export type PortfolioCategoryKey = InvestmentType | "CRYPTO";
export type PortfolioAssetSource = "pluggy" | "manual";
export type PortfolioManualKind = "crypto" | "market";

export type PortfolioInvestmentInput = {
  id: string;
  itemId: string;
  name: string;
  type: InvestmentType;
  subtype: string | null;
  currencyCode: CurrencyCode;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  quantity: number | null;
  institutionName: string | null;
  issuer: string | null;
  positionCount: number;
  dueDate: string | null;
};

export type PortfolioManualCryptoInput = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
  purchaseTotal: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  amountProfitPercentage: number | null;
  currencyCode: CurrencyCode;
  coingeckoId: string | null;
  priceSource: string | null;
  priceUpdatedAt: string | null;
  updatedAt: string;
  orders?: CryptoOrderView[];
};

export type PortfolioManualMarketInput = {
  id: string;
  symbol: string;
  name: string;
  assetType: "STOCK" | "FII" | "ETF";
  categoryKey: "EQUITY" | "ETF";
  subtype: "STOCK" | "REAL_ESTATE_FUND" | "ETF";
  quantity: number;
  averagePrice: number | null;
  currentPrice: number | null;
  balance: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  amountProfitPercentage: number | null;
  currencyCode: CurrencyCode;
  priceSource: "Yahoo Finance" | "Último preço salvo" | null;
  priceUpdatedAt: string | null;
  history: CryptoHistoryPoint[];
  orders?: CryptoOrderView[];
  realizedProfit: number;
  orderCount: number;
  updatedAt: string;
};

export type PortfolioAsset = {
  id: string;
  sourceId: string;
  source: PortfolioAssetSource;
  manualKind: PortfolioManualKind | null;
  categoryKey: PortfolioCategoryKey;
  categoryLabel: string;
  symbol: string;
  name: string;
  subtype: string | null;
  currencyCode: CurrencyCode;
  balance: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  amountProfitPercentage: number | null;
  quantity: number | null;
  unitPrice: number | null;
  averagePrice: number | null;
  institutionName: string | null;
  issuer: string | null;
  positionCount: number;
  dueDate: string | null;
  logoPath: string | null;
  coingeckoId: string | null;
  priceSource: string | null;
  priceUpdatedAt: string | null;
  orders: CryptoOrderView[];
  history: CryptoHistoryPoint[];
  updatedAt: string | null;
};

export type PortfolioAssetSummary = PortfolioAsset & {
  percentageOfCategory: number;
  percentageOfPortfolio: number;
};

export type PortfolioCategorySummary = {
  key: PortfolioCategoryKey;
  label: string;
  assetCount: number;
  lots: number;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  percentageOfPortfolio: number;
  assets: PortfolioAssetSummary[];
};

export type PortfolioCurrencySummary = {
  currencyCode: CurrencyCode;
  assetCount: number;
  lots: number;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  categories: PortfolioCategorySummary[];
  assets: PortfolioAssetSummary[];
};

export type PortfolioSnapshotData = {
  snapshotDate: string;
  currencyCode: CurrencyCode;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  categories: Array<{
    categoryKey: PortfolioCategoryKey;
    balance: number;
    amountOriginal: number | null;
    amountProfit: number | null;
    assetCount: number;
  }>;
};

export type PortfolioHistoryPoint = {
  date: string;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
};

export const portfolioCategoryLabels: Record<PortfolioCategoryKey, string> = {
  COE: "COE",
  EQUITY: "Renda variável",
  ETF: "ETFs",
  FIXED_INCOME: "Renda fixa",
  MUTUAL_FUND: "Fundos",
  OTHER: "Outros",
  SECURITY: "Previdência",
  CRYPTO: "Criptoativos",
};

export const portfolioCategoryColors: Record<PortfolioCategoryKey, string> = {
  ...investmentCategoryColors,
  CRYPTO: "#f59e0b",
};

const portfolioCategoryOrder: PortfolioCategoryKey[] = [
  "FIXED_INCOME",
  "MUTUAL_FUND",
  "EQUITY",
  "ETF",
  "SECURITY",
  "COE",
  "CRYPTO",
  "OTHER",
];

function addNullableValue(total: number | null, value: number | null) {
  if (value === null) {
    return total;
  }

  return (total ?? 0) + value;
}

function getProfitPercentage(
  amountProfit: number | null,
  amountOriginal: number | null,
) {
  if (amountProfit === null || amountOriginal === null || amountOriginal <= 0) {
    return null;
  }

  return (amountProfit / amountOriginal) * 100;
}

function getBalance(value: number | null) {
  return value !== null && Number.isFinite(value) ? value : 0;
}

function calculateAveragePrice(
  categoryKey: PortfolioCategoryKey,
  amountOriginal: number | null,
  quantity: number | null,
) {
  if (
    categoryKey !== "EQUITY" &&
    categoryKey !== "ETF" &&
    categoryKey !== "CRYPTO"
  ) {
    return null;
  }

  if (
    amountOriginal === null ||
    quantity === null ||
    !Number.isFinite(amountOriginal) ||
    !Number.isFinite(quantity) ||
    amountOriginal < 0 ||
    quantity <= 0
  ) {
    return null;
  }

  return amountOriginal / quantity;
}

export function buildPortfolioAssets(
  investments: PortfolioInvestmentInput[],
  manualAssets: PortfolioManualCryptoInput[],
  manualMarketAssets: PortfolioManualMarketInput[] = [],
): PortfolioAsset[] {
  return [
    ...investments.map((investment) => ({
      id: `pluggy:${investment.id}`,
      sourceId: investment.id,
      source: "pluggy" as const,
      manualKind: null,
      categoryKey: investment.type,
      categoryLabel: portfolioCategoryLabels[investment.type],
      symbol: investment.subtype ?? investment.type,
      name: investment.name,
      subtype: investment.subtype,
      currencyCode: investment.currencyCode,
      balance: investment.balance,
      amountOriginal: investment.amountOriginal,
      amountProfit: investment.amountProfit,
      amountProfitPercentage: getProfitPercentage(
        investment.amountProfit,
        investment.amountOriginal,
      ),
      quantity: investment.quantity,
      unitPrice: null,
      averagePrice: calculateAveragePrice(
        investment.type,
        investment.amountOriginal,
        investment.quantity,
      ),
      institutionName: investment.institutionName,
      issuer: investment.issuer,
      positionCount: investment.positionCount,
      dueDate: investment.dueDate,
      logoPath: getBankLogoPath(
        investment.institutionName,
        investment.issuer,
        investment.name,
      ),
      coingeckoId: null,
      priceSource: null,
      priceUpdatedAt: null,
      orders: [],
      history: [],
      updatedAt: null,
    })),
    ...manualAssets.map((asset) => {
      const amountOriginal = asset.amountOriginal ?? asset.purchaseTotal;

      return {
        id: `manual:${asset.id}`,
        sourceId: asset.id,
        source: "manual" as const,
        manualKind: "crypto" as const,
        categoryKey: "CRYPTO" as const,
        categoryLabel: portfolioCategoryLabels.CRYPTO,
        symbol: asset.symbol,
        name: asset.name,
        subtype: null,
        currencyCode: asset.currencyCode,
        balance:
          asset.currentPrice === null
            ? null
            : asset.currentPrice * asset.quantity,
        amountOriginal,
        amountProfit: asset.amountProfit,
        amountProfitPercentage:
          asset.amountProfitPercentage ??
          getProfitPercentage(asset.amountProfit, amountOriginal),
        quantity: asset.quantity,
        unitPrice: asset.currentPrice,
        averagePrice:
          asset.averagePrice ??
          calculateAveragePrice("CRYPTO", amountOriginal, asset.quantity),
        institutionName: null,
        issuer: null,
        positionCount: Math.max(asset.orders?.length ?? 0, 1),
        dueDate: null,
        logoPath: getCryptoAssetLogo(asset.coingeckoId),
        coingeckoId: asset.coingeckoId,
        priceSource: asset.priceSource,
        priceUpdatedAt: asset.priceUpdatedAt,
        orders: asset.orders ?? [],
        history: [],
        updatedAt: asset.updatedAt,
      };
    }),
    ...manualMarketAssets.map((asset) => ({
      id: `manual-market:${asset.id}`,
      sourceId: asset.id,
      source: "manual" as const,
      manualKind: "market" as const,
      categoryKey: asset.categoryKey,
      categoryLabel: portfolioCategoryLabels[asset.categoryKey],
      symbol: asset.symbol,
      name: asset.name,
      subtype: asset.subtype,
      currencyCode: asset.currencyCode,
      balance: asset.balance,
      amountOriginal: asset.amountOriginal,
      amountProfit: asset.amountProfit,
      amountProfitPercentage: asset.amountProfitPercentage,
      quantity: asset.quantity,
      unitPrice: asset.currentPrice,
      averagePrice:
        asset.averagePrice ??
        calculateAveragePrice(
          asset.categoryKey,
          asset.amountOriginal,
          asset.quantity,
        ),
      institutionName: null,
      issuer: null,
      positionCount: Math.max(asset.orders?.length ?? asset.orderCount, 1),
      dueDate: null,
      logoPath: getMarketAssetLogo(asset.symbol, asset.assetType),
      coingeckoId: null,
      priceSource: asset.priceSource,
      priceUpdatedAt: asset.priceUpdatedAt,
      orders: asset.orders ?? [],
      history: asset.history,
      updatedAt: asset.updatedAt,
    })),
  ];
}

export function summarizePortfolioAssets(
  assets: PortfolioAsset[],
): PortfolioCurrencySummary[] {
  const currencies = new Map<
    CurrencyCode,
    {
      assetCount: number;
      lots: number;
      balance: number;
      amountOriginal: number | null;
      amountProfit: number | null;
      categories: Map<PortfolioCategoryKey, PortfolioCategorySummary>;
    }
  >();

  for (const asset of assets) {
    const currency = currencies.get(asset.currencyCode) ?? {
      assetCount: 0,
      lots: 0,
      balance: 0,
      amountOriginal: null,
      amountProfit: null,
      categories: new Map<PortfolioCategoryKey, PortfolioCategorySummary>(),
    };
    currencies.set(asset.currencyCode, currency);

    currency.assetCount += 1;
    currency.lots += asset.positionCount;
    currency.balance += getBalance(asset.balance);
    currency.amountOriginal = addNullableValue(
      currency.amountOriginal,
      asset.amountOriginal,
    );
    currency.amountProfit = addNullableValue(
      currency.amountProfit,
      asset.amountProfit,
    );

    const category = currency.categories.get(asset.categoryKey) ?? {
      key: asset.categoryKey,
      label: asset.categoryLabel,
      assetCount: 0,
      lots: 0,
      balance: 0,
      amountOriginal: null,
      amountProfit: null,
      percentageOfPortfolio: 0,
      assets: [],
    };
    currency.categories.set(asset.categoryKey, category);

    category.assetCount += 1;
    category.lots += asset.positionCount;
    category.balance += getBalance(asset.balance);
    category.amountOriginal = addNullableValue(
      category.amountOriginal,
      asset.amountOriginal,
    );
    category.amountProfit = addNullableValue(
      category.amountProfit,
      asset.amountProfit,
    );
    category.assets.push({
      ...asset,
      percentageOfCategory: 0,
      percentageOfPortfolio: 0,
    });
  }

  return [...currencies.entries()]
    .sort(([left], [right]) => {
      if (left === "BRL") return -1;
      if (right === "BRL") return 1;
      return left.localeCompare(right);
    })
    .map(([currencyCode, currency]) => {
      const categories = [...currency.categories.values()]
        .sort(
          (left, right) =>
            portfolioCategoryOrder.indexOf(left.key) -
              portfolioCategoryOrder.indexOf(right.key) ||
            right.balance - left.balance,
        )
        .map((category) => {
          const assetsWithShares = category.assets
            .sort(
              (left, right) =>
                getBalance(right.balance) - getBalance(left.balance) ||
                left.name.localeCompare(right.name),
            )
            .map((asset) => ({
              ...asset,
              percentageOfCategory:
                category.balance > 0
                  ? (getBalance(asset.balance) / category.balance) * 100
                  : 0,
              percentageOfPortfolio:
                currency.balance > 0
                  ? (getBalance(asset.balance) / currency.balance) * 100
                  : 0,
            }));

          return {
            ...category,
            percentageOfPortfolio:
              currency.balance > 0
                ? (category.balance / currency.balance) * 100
                : 0,
            assets: assetsWithShares,
          };
        });

      return {
        currencyCode,
        assetCount: currency.assetCount,
        lots: currency.lots,
        balance: currency.balance,
        amountOriginal: currency.amountOriginal,
        amountProfit: currency.amountProfit,
        categories,
        assets: categories.flatMap((category) => category.assets),
      };
    });
}

export function buildPortfolioSnapshotData(
  currencies: PortfolioCurrencySummary[],
  snapshotDate: string,
): PortfolioSnapshotData[] {
  return currencies.map((currency) => ({
    snapshotDate,
    currencyCode: currency.currencyCode,
    balance: currency.balance,
    amountOriginal: currency.amountOriginal,
    amountProfit: currency.amountProfit,
    categories: currency.categories.map((category) => ({
      categoryKey: category.key,
      balance: category.balance,
      amountOriginal: category.amountOriginal,
      amountProfit: category.amountProfit,
      assetCount: category.assetCount,
    })),
  }));
}
