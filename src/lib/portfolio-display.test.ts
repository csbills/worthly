import { describe, expect, it } from "vitest";

import * as portfolioDisplay from "./portfolio-display";

const {
  getPortfolioAssetLabel,
  getPortfolioAssetQuantityLabel,
  getPortfolioCategoryToggleLabel,
} = portfolioDisplay;

const manualStock = {
  source: "manual",
  symbol: "PETR4",
  categoryKey: "EQUITY",
  quantity: 4,
  subtype: "STOCK",
  name: "Petrobras PN",
  institutionName: null,
  issuer: null,
} as const;

const pluggyFixedIncome = {
  source: "pluggy",
  symbol: "CDB",
  categoryKey: "FIXED_INCOME",
  quantity: 396_652.1048,
  subtype: "CDB",
  name: "CDB - NU FINANCEIRA S.A.",
  institutionName: "NU FINANCEIRA S.A.",
  issuer: "NU FINANCEIRA S.A.",
} as const;

describe("Portfolio asset display", () => {
  it("prefers a ticker for manual market assets and a compact institution name for Pluggy assets", () => {
    expect(getPortfolioAssetLabel(manualStock)).toBe("PETR4");
    expect(getPortfolioAssetLabel(pluggyFixedIncome)).toBe("CDB · Nubank");
  });

  it("shows quantities only for positions where quotas or units are useful", () => {
    expect(getPortfolioAssetQuantityLabel(manualStock)).toBe("4 cotas");
    expect(getPortfolioAssetQuantityLabel(pluggyFixedIncome)).toBeNull();
  });

  it("describes the category disclosure action for assistive technologies", () => {
    expect(getPortfolioCategoryToggleLabel("Renda fixa")).toBe(
      "Mostrar ou ocultar ativos de Renda fixa",
    );
  });

  it("prepares category assets for the allocation tooltip ordered by balance", () => {
    const assets = [
      {
        id: "itub4",
        source: "manual",
        symbol: "ITUB4",
        categoryKey: "EQUITY",
        quantity: 2,
        subtype: "STOCK",
        name: "Itaú Unibanco PN",
        institutionName: null,
        issuer: null,
        balance: 100,
        percentageOfCategory: 33.3,
      },
      {
        id: "petr4",
        source: "manual",
        symbol: "PETR4",
        categoryKey: "EQUITY",
        quantity: 4,
        subtype: "STOCK",
        name: "Petrobras PN",
        institutionName: null,
        issuer: null,
        balance: 200,
        percentageOfCategory: 66.7,
      },
    ] as const;

    expect("getPortfolioAllocationTooltipAssets" in portfolioDisplay).toBe(
      true,
    );

    if ("getPortfolioAllocationTooltipAssets" in portfolioDisplay) {
      expect(
        portfolioDisplay.getPortfolioAllocationTooltipAssets(assets),
      ).toEqual([
        {
          id: "petr4",
          label: "PETR4",
          balance: 200,
          percentageOfCategory: 66.7,
        },
        {
          id: "itub4",
          label: "ITUB4",
          balance: 100,
          percentageOfCategory: 33.3,
        },
      ]);
    }
  });
});
