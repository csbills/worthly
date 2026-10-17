import type { MarketAssetType } from "./market-assets";

const companyLogoPaths: Partial<Record<string, string>> = {
  ITUB4: "/assets/companies/itau.svg",
  PETR4: "/assets/companies/petrobras.svg",
};

const placeholderLogoPaths: Record<MarketAssetType, string> = {
  STOCK: "/assets/market/placeholders/stock.svg",
  FII: "/assets/market/placeholders/fii.svg",
  ETF: "/assets/market/placeholders/etf.svg",
};

export function getMarketAssetLogo(symbol: string, assetType: MarketAssetType) {
  const normalizedSymbol = symbol.trim().toLocaleUpperCase("pt-BR");

  return companyLogoPaths[normalizedSymbol] ?? placeholderLogoPaths[assetType];
}
