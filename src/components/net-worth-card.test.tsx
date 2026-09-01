import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./net-worth-chart", () => ({
  NetWorthChart: ({ history }: { history: unknown[] }) => (
    <div data-testid="net-worth-chart">{history.length} pontos</div>
  ),
}));

import { NetWorthCard } from "./net-worth-card";

describe("NetWorthCard", () => {
  it("renders the current total, breakdown, and evolution chart", () => {
    const markup = renderToStaticMarkup(
      <NetWorthCard
        current={{
          accountBalance: 3000,
          investmentBalance: 6500,
          creditUsed: 1340.67,
          netWorth: 8159.33,
        }}
        history={[
          { date: "2026-08-31", netWorth: 7900 },
          { date: "2026-09-01", netWorth: 8159.33 },
        ]}
        currencyCode="BRL"
        error={null}
      />,
    ).replaceAll("\u00a0", " ");

    expect(markup).toContain("Patrimônio líquido");
    expect(markup).toContain("R$ 8.159,33");
    expect(markup).toContain("Contas");
    expect(markup).toContain("R$ 3.000,00");
    expect(markup).toContain("Investimentos");
    expect(markup).toContain("R$ 6.500,00");
    expect(markup).toContain("Cartões");
    expect(markup).toContain("R$ 1.340,67");
    expect(markup).toContain("+R$ 259,33");
    expect(markup).toContain("3,3%");
    expect(markup).toContain("2 pontos");
  });
});
