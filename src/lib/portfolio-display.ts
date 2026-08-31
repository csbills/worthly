import { getBankDisplayName } from "./bank-assets";
import type { PortfolioAsset } from "./portfolio";

type PortfolioAssetDisplayInput = Pick<
  PortfolioAsset,
  | "source"
  | "symbol"
  | "categoryKey"
  | "quantity"
  | "subtype"
  | "name"
  | "institutionName"
  | "issuer"
>;

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

export function getPortfolioAssetLabel(asset: PortfolioAssetDisplayInput) {
  if (asset.source === "manual") {
    return asset.symbol;
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

export function getPortfolioAssetQuantityLabel(
  asset: PortfolioAssetDisplayInput,
) {
  const isQuotaBased =
    asset.source === "manual" ||
    asset.categoryKey === "EQUITY" ||
    asset.categoryKey === "ETF" ||
    asset.categoryKey === "CRYPTO";

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

  return asset.categoryKey === "CRYPTO"
    ? `${quantity} ${asset.symbol}`
    : `${quantity} cotas`;
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
