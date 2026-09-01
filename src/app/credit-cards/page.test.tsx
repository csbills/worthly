import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCreditCards: vi.fn(),
  getInstallments: vi.fn(),
}));

vi.mock("@/actions/credit-cards", () => ({
  getCreditCards: mocks.getCreditCards,
}));
vi.mock("@/actions/installments", () => ({
  getInstallments: mocks.getInstallments,
}));
vi.mock("@/components/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/components/installments-view", () => ({
  InstallmentsView: () => (
    <section data-testid="installments-section">
      Parcelamentos integrados
    </section>
  ),
}));
vi.mock("@/lib/credit-cards", () => ({
  formatCreditCardDueDate: () => "—",
}));

import CreditCardsPage from "./page";

describe("CreditCardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCreditCards.mockResolvedValue({
      cards: [],
      totalOpenBalance: 0,
      error: null,
    });
    mocks.getInstallments.mockResolvedValue({
      cardCount: 0,
      installments: ["installment"],
      summary: {},
      error: null,
    });
  });

  it("loads and renders installment content on the credit cards page", async () => {
    const page = await CreditCardsPage();
    const markup = renderToStaticMarkup(page);

    expect(mocks.getInstallments).toHaveBeenCalledTimes(1);
    expect(markup).toContain('data-testid="installments-section"');
    expect(markup).toContain("Parcelamentos integrados");
  });
});
