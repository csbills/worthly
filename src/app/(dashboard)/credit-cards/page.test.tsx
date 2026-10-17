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

  it("separates the open invoice from the next invoice in progress", async () => {
    mocks.getCreditCards.mockResolvedValue({
      cards: [
        {
          id: "credit-card",
          itemId: "item-inter",
          name: "GOLD",
          level: "GOLD",
          brand: "MASTERCARD",
          bankName: "Inter",
          bankLogoPath: null,
          lastFourDigits: "8896",
          openBalanceAmount: 1169.94,
          openDueDate: "2026-09-02T00:00:00.000Z",
          latestClosedBill: null,
          nextBillInProgress: {
            amount: 245,
            transactionCount: 2,
            closingDate: "2026-09-25T00:00:00.000Z",
            dueDate: "2026-10-02T00:00:00.000Z",
          },
          billError: null,
          nextBillError: null,
          creditLimit: 1405.05,
          usedAmount: 1169.94,
          availableAmount: 235.11,
          currencyCode: "BRL",
          status: "ACTIVE",
        },
      ],
      totalOpenBalance: 1169.94,
      error: null,
    });

    const page = await CreditCardsPage();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Fatura a pagar");
    expect(markup).toContain("Próxima fatura em formação");
    expect(markup).toContain("2 compras");
  });
});
