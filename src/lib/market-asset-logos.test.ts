import { describe, expect, it } from "vitest";

import { getMarketAssetLogo } from "./market-asset-logos";

describe("Market asset logos", () => {
  it("uses the supplied company logos for supported stocks", () => {
    expect(getMarketAssetLogo("PETR4", "STOCK")).toBe(
      "/assets/companies/petrobras.svg",
    );
    expect(getMarketAssetLogo("ITUB4", "STOCK")).toBe(
      "/assets/companies/itau.svg",
    );
  });

  it("uses a distinct placeholder for each market asset type", () => {
    expect(getMarketAssetLogo("VALE3", "STOCK")).toBe(
      "/assets/market/placeholders/stock.svg",
    );
    expect(getMarketAssetLogo("KNCR11", "FII")).toBe(
      "/assets/market/placeholders/fii.svg",
    );
    expect(getMarketAssetLogo("B5P211", "ETF")).toBe(
      "/assets/market/placeholders/etf.svg",
    );
  });
});
