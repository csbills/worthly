import { describe, expect, it } from "vitest";

import {
  findSupportedMarketAsset,
  getMarketAssetClassification,
} from "./market-assets";

describe("Market asset catalog", () => {
  it("resolves stocks, real estate funds, and ETFs by ticker", () => {
    expect(findSupportedMarketAsset("petr4")).toMatchObject({
      symbol: "PETR4",
      assetType: "STOCK",
    });
    expect(findSupportedMarketAsset("mxrf11")).toMatchObject({
      symbol: "MXRF11",
      assetType: "FII",
    });
    expect(findSupportedMarketAsset("ivvb11")).toMatchObject({
      symbol: "IVVB11",
      assetType: "ETF",
    });
    expect(findSupportedMarketAsset("kncr11")).toMatchObject({
      symbol: "KNCR11",
      assetType: "FII",
    });
    expect(findSupportedMarketAsset("b5p211")).toMatchObject({
      symbol: "B5P211",
      assetType: "ETF",
    });
  });

  it("maps manual asset types to the same portfolio categories as Pluggy", () => {
    expect(getMarketAssetClassification("STOCK")).toEqual({
      categoryKey: "EQUITY",
      subtype: "STOCK",
      label: "Ação",
    });
    expect(getMarketAssetClassification("FII")).toEqual({
      categoryKey: "EQUITY",
      subtype: "REAL_ESTATE_FUND",
      label: "Fundo imobiliário",
    });
    expect(getMarketAssetClassification("ETF")).toEqual({
      categoryKey: "ETF",
      subtype: "ETF",
      label: "ETF",
    });
  });
});
