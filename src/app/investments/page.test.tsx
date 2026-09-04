import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortfolio: vi.fn(),
}));

vi.mock("@/actions/portfolio", () => ({
  getPortfolio: mocks.getPortfolio,
}));
vi.mock("@/components/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/components/manual-crypto-order-modal", () => ({
  ManualCryptoOrderModal: () => null,
}));
vi.mock("@/components/manual-market-order-modal", () => ({
  ManualMarketOrderModal: () => null,
}));
vi.mock("@/components/portfolio-allocation-chart", () => ({
  PortfolioAllocationChart: () => null,
}));
vi.mock("@/components/portfolio-evolution-chart", () => ({
  PortfolioEvolutionChart: () => null,
}));
vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));
vi.mock("@/lib/crypto-assets", () => ({
  supportedCryptoAssets: [],
}));
vi.mock("@/lib/market-assets", () => ({
  supportedMarketAssets: [],
}));
vi.mock("@/lib/portfolio", () => ({
  portfolioCategoryColors: { EQUITY: "#000000" },
}));
vi.mock("@/lib/portfolio-display", () => ({
  getPortfolioAssetLabel: (asset: { symbol: string }) => asset.symbol,
  getPortfolioAssetLogoPath: () => null,
  getPortfolioAssetQuantityLabel: () => null,
  getPortfolioCategoryToggleLabel: (label: string) => label,
}));
vi.mock("next/image", () => ({
  default: () => null,
}));
vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: () => null,
}));

import InvestmentsPage from "./page";

describe("InvestmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPortfolio.mockResolvedValue({
      itemCount: 1,
      manualAssetCount: 0,
      manualCryptoAssetCount: 0,
      manualMarketAssetCount: 0,
      error: null,
      currencies: [
        {
          currencyCode: "BRL",
          assetCount: 1,
          lots: 1,
          balance: 1100,
          amountOriginal: 1000,
          amountProfit: 125,
          income: 25,
          history: [],
          assets: [
            {
              id: "pluggy:investment-equity",
              sourceId: "investment-equity",
              source: "pluggy",
              manualKind: null,
              categoryKey: "EQUITY",
              categoryLabel: "Renda variável",
              symbol: "STOCK",
              name: "PETR4",
              subtype: "STOCK",
              currencyCode: "BRL",
              balance: 1100,
              amountOriginal: 1000,
              amountProfit: 125,
              income: 25,
              amountProfitPercentage: 12.5,
              quantity: 10,
              unitPrice: null,
              averagePrice: 100,
              institutionName: "Corretora",
              issuer: null,
              positionCount: 1,
              dueDate: null,
              logoPath: null,
              coingeckoId: null,
              priceSource: null,
              priceUpdatedAt: null,
              orders: [],
              history: [],
              updatedAt: null,
              percentageOfCategory: 100,
              percentageOfPortfolio: 100,
            },
          ],
          categories: [
            {
              key: "EQUITY",
              label: "Renda variável",
              assetCount: 1,
              lots: 1,
              balance: 1100,
              amountOriginal: 1000,
              amountProfit: 125,
              income: 25,
              percentageOfPortfolio: 100,
              assets: [],
            },
          ],
        },
      ],
    });
  });

  it("shows result and proventos in the portfolio summary", async () => {
    const page = await InvestmentsPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Proventos");
    expect(markup).toContain("Resultado");
    expect(markup).toContain("R$ 125,00");
    expect(markup).toContain("R$ 25,00");
  });
});
