import { getBankDisplayName } from "./bank-assets";
import { getMarketAssetLogo } from "./market-asset-logos";
import { type MarketAssetType, supportedMarketAssets } from "./market-assets";
import type { PortfolioAsset } from "./portfolio";

type PortfolioAssetDisplayInput = Pick<
  PortfolioAsset,
  | "symbol"
  | "categoryKey"
  | "quantity"
  | "subtype"
  | "name"
  | "institutionName"
  | "issuer"
> & {
  logoPath?: PortfolioAsset["logoPath"];
};

type PortfolioAllocationTooltipAssetInput = PortfolioAssetDisplayInput & {
  id: string;
  balance: number | null;
  percentageOfCategory: number;
};

const subtypeLabels: Record<string, string> = {
  CDB: "CDB",
  ETF: "ETF",
  FIXED_INCOME_FUND: "Fundo de renda fixa",
  INVESTMENT_FUND: "Fundo de investimento",
  REAL_ESTATE_FUND: "Fundo imobiliário",
  STOCK: "Ação",
};

function formatSubtype(subtype: string | null) {
  if (!subtype) {
    return null;
  }

  return (
    subtypeLabels[subtype] ??
    subtype
      .replaceAll("_", " ")
      .toLocaleLowerCase("pt-BR")
      .replace(/^./u, (letter) => letter.toLocaleUpperCase("pt-BR"))
  );
}

function abbreviate(value: string) {
  const normalized = value.replace(/\s+/gu, " ").trim();

  if (normalized.length <= 32) {
    return normalized;
  }

  return `${normalized.slice(0, 31).trimEnd()}…`;
}

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleUpperCase("pt-BR");
}

function getAutomaticMarketAssetType(
  asset: PortfolioAssetDisplayInput,
): MarketAssetType | null {
  if (asset.categoryKey === "ETF" || asset.subtype === "ETF") {
    return "ETF";
  }

  if (asset.subtype === "REAL_ESTATE_FUND") {
    return "FII";
  }

  if (asset.subtype === "STOCK") {
    return "STOCK";
  }

  return null;
}

function getAutomaticMarketTicker(asset: PortfolioAssetDisplayInput) {
  if (!getAutomaticMarketAssetType(asset)) {
    return null;
  }

  const identity = normalizeIdentity(
    [asset.name, asset.issuer, asset.symbol].filter(Boolean).join(" "),
  );
  const catalogAsset = supportedMarketAssets.find(({ symbol, name }) => {
    const normalizedSymbol = normalizeIdentity(symbol);
    const normalizedName = normalizeIdentity(name);

    return (
      identity.includes(normalizedSymbol) ||
      (normalizedName.length > 0 && identity.includes(normalizedName))
    );
  });

  if (catalogAsset) {
    return catalogAsset.symbol;
  }

  return (
    identity.match(/\b(?:[A-Z]{4,5}\d{1,2}|[A-Z]\d[A-Z]\d{3})\b/u)?.[0] ?? null
  );
}

export function getPortfolioAssetLabel(asset: PortfolioAssetDisplayInput) {
  const marketTicker = getAutomaticMarketTicker(asset);

  if (marketTicker) {
    return marketTicker;
  }

  if (getAutomaticMarketAssetType(asset)) {
    return abbreviate(asset.name);
  }

  const subtype = formatSubtype(asset.subtype);
  const institution = getBankDisplayName(
    asset.institutionName,
    asset.issuer,
    asset.name,
  );

  if (subtype && institution !== "Banco não identificado") {
    return `${subtype} · ${abbreviate(institution)}`;
  }

  return abbreviate(asset.name);
}

export function getPortfolioAssetLogoPath(asset: PortfolioAssetDisplayInput) {
  const marketAssetType = getAutomaticMarketAssetType(asset);

  if (marketAssetType) {
    return getMarketAssetLogo(
      getAutomaticMarketTicker(asset) ?? asset.symbol,
      marketAssetType,
    );
  }

  return asset.logoPath ?? null;
}

export function getPortfolioAssetQuantityLabel(
  asset: PortfolioAssetDisplayInput,
) {
  const isQuotaBased =
    asset.categoryKey === "EQUITY" || asset.categoryKey === "ETF";

  if (
    asset.quantity === null ||
    !Number.isFinite(asset.quantity) ||
    !isQuotaBased
  ) {
    return null;
  }

  const quantity = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8,
  }).format(asset.quantity);

  return `${quantity} cotas`;
}

export function getPortfolioCategoryToggleLabel(categoryLabel: string) {
  return `Mostrar ou ocultar ativos de ${categoryLabel}`;
}

export function getPortfolioAllocationTooltipAssets(
  assets: readonly PortfolioAllocationTooltipAssetInput[],
) {
  return [...assets]
    .sort((left, right) => (right.balance ?? 0) - (left.balance ?? 0))
    .map((asset) => ({
      id: asset.id,
      label: getPortfolioAssetLabel(asset),
      balance: asset.balance ?? 0,
      percentageOfCategory: asset.percentageOfCategory,
    }));
}
