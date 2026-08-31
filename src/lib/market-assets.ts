import type { InvestmentSubtype, InvestmentType } from "pluggy-sdk";

export const supportedMarketAssets = [
  { symbol: "PETR4", name: "Petrobras PN", assetType: "STOCK" },
  { symbol: "VALE3", name: "Vale ON", assetType: "STOCK" },
  { symbol: "ITUB4", name: "Itaú Unibanco PN", assetType: "STOCK" },
  { symbol: "BBDC4", name: "Banco Bradesco PN", assetType: "STOCK" },
  { symbol: "BBAS3", name: "Banco do Brasil ON", assetType: "STOCK" },
  { symbol: "WEGE3", name: "Weg ON", assetType: "STOCK" },
  { symbol: "ABEV3", name: "Ambev ON", assetType: "STOCK" },
  { symbol: "B3SA3", name: "B3 ON", assetType: "STOCK" },
  { symbol: "RENT3", name: "Localiza ON", assetType: "STOCK" },
  { symbol: "ELET3", name: "Axia Energia ON", assetType: "STOCK" },
  { symbol: "SUZB3", name: "Suzano ON", assetType: "STOCK" },
  { symbol: "PRIO3", name: "PRIO ON", assetType: "STOCK" },
  { symbol: "MGLU3", name: "Magazine Luiza ON", assetType: "STOCK" },
  { symbol: "LREN3", name: "Lojas Renner ON", assetType: "STOCK" },
  { symbol: "MXRF11", name: "Maxi Renda", assetType: "FII" },
  { symbol: "HGLG11", name: "CSHG Logística", assetType: "FII" },
  { symbol: "KNRI11", name: "Kinea Renda Imobiliária", assetType: "FII" },
  { symbol: "XPML11", name: "XP Malls", assetType: "FII" },
  { symbol: "VISC11", name: "Vinci Shopping Centers", assetType: "FII" },
  { symbol: "XPLG11", name: "XP Log", assetType: "FII" },
  { symbol: "HGRU11", name: "CSHG Renda Urbana", assetType: "FII" },
  { symbol: "CPTS11", name: "Capitânia Securities II", assetType: "FII" },
  {
    symbol: "IRDM11",
    name: "Iridium Recebíveis Imobiliários",
    assetType: "FII",
  },
  { symbol: "BCFF11", name: "BTG Fundo de Fundos", assetType: "FII" },
  { symbol: "HSML11", name: "HSI Malls", assetType: "FII" },
  { symbol: "RBRF11", name: "RBR Alpha", assetType: "FII" },
  {
    symbol: "KNCR11",
    name: "Kinea Rendimentos Imobiliários",
    assetType: "FII",
  },
  { symbol: "BOVA11", name: "iShares Ibovespa", assetType: "ETF" },
  { symbol: "IVVB11", name: "iShares S&P 500", assetType: "ETF" },
  { symbol: "SMAL11", name: "iShares Small Cap", assetType: "ETF" },
  { symbol: "DIVO11", name: "It Now IDIV", assetType: "ETF" },
  { symbol: "GOLD11", name: "Trend Ouro", assetType: "ETF" },
  { symbol: "HASH11", name: "Hashdex Nasdaq Crypto", assetType: "ETF" },
  { symbol: "XINA11", name: "Trend China", assetType: "ETF" },
  { symbol: "WRLD11", name: "Investo Global", assetType: "ETF" },
  { symbol: "B5P211", name: "It Now IMA-B5 P2", assetType: "ETF" },
] as const;

export type ManualMarketAssetType =
  (typeof supportedMarketAssets)[number]["assetType"];

export type SupportedMarketAsset = (typeof supportedMarketAssets)[number];

export type MarketAssetClassification = {
  categoryKey: Extract<InvestmentType, "EQUITY" | "ETF">;
  subtype: Extract<InvestmentSubtype, "STOCK" | "REAL_ESTATE_FUND" | "ETF">;
  label: string;
};

export function findSupportedMarketAsset(value: string) {
  const normalizedValue = value.trim().toLocaleUpperCase("pt-BR");

  return supportedMarketAssets.find(
    (asset) => asset.symbol === normalizedValue,
  );
}

export function getMarketAssetClassification(
  assetType: ManualMarketAssetType,
): MarketAssetClassification {
  if (assetType === "FII") {
    return {
      categoryKey: "EQUITY",
      subtype: "REAL_ESTATE_FUND",
      label: "Fundo imobiliário",
    };
  }

  if (assetType === "ETF") {
    return {
      categoryKey: "ETF",
      subtype: "ETF",
      label: "ETF",
    };
  }

  return {
    categoryKey: "EQUITY",
    subtype: "STOCK",
    label: "Ação",
  };
}
