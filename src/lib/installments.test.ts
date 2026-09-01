import { describe, expect, it } from "vitest";

import {
  buildInstallments,
  type InstallmentCreditCardMetadata,
  type InstallmentSourceTransaction,
  summarizeInstallments,
} from "./installments";

type SourceOverrides = Omit<
  Partial<InstallmentSourceTransaction>,
  "creditCardMetadata"
> & {
  creditCardMetadata?: Partial<InstallmentCreditCardMetadata> | null;
};

function makeTransaction(
  overrides: SourceOverrides = {},
): InstallmentSourceTransaction {
  const { creditCardMetadata, ...transactionOverrides } = overrides;

  return {
    id: "transaction-1",
    accountId: "account-1",
    date: "2026-08-04T12:00:00.000Z",
    description: "Mercado Livre",
    amount: 54.95,
    type: "DEBIT",
    status: "POSTED",
    currencyCode: "BRL",
    categoryLabel: "Compras online",
    categoryIcon: "🛍️",
    categoryColor: "#ec4899",
    bankName: "Inter",
    bankLogoPath: "/assets/banks/inter.svg",
    cardNumber: "****1234",
    creditCardMetadata:
      creditCardMetadata === null
        ? null
        : {
            installmentNumber: 1,
            totalInstallments: 7,
            totalAmount: 0,
            purchaseDate: "2026-02-04T12:00:00.000Z",
            billId: null,
            ...creditCardMetadata,
          },
    ...transactionOverrides,
  };
}

describe("installment consolidation", () => {
  it("keeps same-merchant purchases apart and calculates total from the installment amount", () => {
    const installments = buildInstallments([
      makeTransaction({
        id: "purchase-a-1",
        amount: 54.95,
        creditCardMetadata: {
          installmentNumber: 1,
        },
      }),
      makeTransaction({
        id: "purchase-a-2",
        date: "2026-03-04T12:00:00.000Z",
        description: "  MERCADO   LIVRE ",
        amount: 54.95,
        creditCardMetadata: {
          installmentNumber: 2,
        },
      }),
      makeTransaction({
        id: "purchase-b-1",
        amount: 20.54,
        creditCardMetadata: {
          installmentNumber: 1,
        },
      }),
    ]);

    expect(installments).toHaveLength(2);

    const purchaseA = installments.find(
      (installment) => installment.installmentAmount === 54.95,
    );

    expect(purchaseA).toMatchObject({
      totalInstallments: 7,
      latestInstallmentNumber: 2,
      installmentAmount: 54.95,
      totalAmount: 384.65,
      paidAmount: 109.9,
      remainingAmount: 274.75,
      progressPercentage: 28.57,
      status: "ACTIVE",
    });
    expect(purchaseA?.observedInstallments).toHaveLength(2);
  });

  it("consolidates consecutive parcels when the institution changes the amount by cents", () => {
    const installments = buildInstallments([
      makeTransaction({
        id: "maria-julia-1",
        date: "2026-07-08T20:35:47.000Z",
        description: "PG *MARIA JULIA MURY R",
        amount: 35.82,
        creditCardMetadata: {
          installmentNumber: 1,
          totalInstallments: 10,
          purchaseDate: "2026-07-08T20:35:47.000Z",
          cardNumber: "3112",
        },
      }),
      makeTransaction({
        id: "maria-julia-2",
        date: "2026-07-27T03:00:00.000Z",
        description: "PG *MARIA JULIA MURY R",
        amount: 35.82,
        creditCardMetadata: {
          installmentNumber: 2,
          totalInstallments: 10,
          purchaseDate: "2026-07-08T20:35:47.000Z",
          cardNumber: "3112",
        },
      }),
      makeTransaction({
        id: "maria-julia-3",
        date: "2026-08-25T03:00:00.000Z",
        description: "PG *MARIA JULIA MURY R",
        amount: 35.76,
        creditCardMetadata: {
          installmentNumber: 3,
          totalInstallments: 10,
          purchaseDate: "2026-07-08T20:35:47.000Z",
          cardNumber: "3112",
        },
      }),
    ]);

    expect(installments).toHaveLength(1);
    expect(installments[0]).toMatchObject({
      latestInstallmentNumber: 3,
      totalInstallments: 10,
      installmentAmount: 35.76,
      totalAmount: 357.6,
      paidAmount: 107.28,
      remainingAmount: 250.32,
      status: "ACTIVE",
    });
    expect(installments[0]?.observedInstallments).toHaveLength(3);
  });

  it("consolidates a purchase when the first parcel differs by eleven cents", () => {
    const installments = buildInstallments(
      [21.46, 21.35, 21.35, 21.35, 21.35, 21.35, 21.35].map((amount, index) =>
        makeTransaction({
          id: `martonshop-${index + 1}`,
          date: "2026-02-18T03:00:00.000Z",
          description: "MP  MARTONSHOP         TABOO DA SER  BRA",
          amount,
          creditCardMetadata: {
            installmentNumber: index + 1,
            totalInstallments: 12,
            purchaseDate: "2026-02-18T14:49:42.000Z",
            cardNumber: "6667",
          },
        }),
      ),
    );

    expect(installments).toHaveLength(1);
    expect(installments[0]).toMatchObject({
      latestInstallmentNumber: 7,
      totalInstallments: 12,
      installmentAmount: 21.35,
      totalAmount: 256.2,
      paidAmount: 149.45,
      remainingAmount: 106.75,
      status: "ACTIVE",
    });
    expect(installments[0]?.observedInstallments).toHaveLength(7);
  });

  it("uses the card due day for installments purchased before closing", () => {
    const transaction = Object.assign(
      makeTransaction({
        id: "vip-center-1",
        date: "2026-03-16T03:00:00.000Z",
        creditCardMetadata: {
          installmentNumber: 1,
          totalInstallments: 10,
          purchaseDate: "2026-03-16T00:00:00.000Z",
          cardNumber: "6667",
        },
      }),
      {
        creditCardBilling: {
          closingDay: 25,
          dueDay: 2,
        },
      },
    );

    const [installment] = buildInstallments([transaction]);

    expect(installment).toMatchObject({
      purchaseDate: "2026-03-16T00:00:00.000Z",
      firstInstallmentDate: "2026-04-02T00:00:00.000Z",
      lastInstallmentDate: "2027-01-02T00:00:00.000Z",
    });
  });

  it("moves the first installment to the following cycle after closing", () => {
    const transaction = Object.assign(
      makeTransaction({
        id: "after-closing-1",
        date: "2026-03-26T03:00:00.000Z",
        creditCardMetadata: {
          installmentNumber: 1,
          totalInstallments: 3,
          purchaseDate: "2026-03-26T00:00:00.000Z",
          cardNumber: "6667",
        },
      }),
      {
        creditCardBilling: {
          closingDay: 25,
          dueDay: 2,
        },
      },
    );

    const [installment] = buildInstallments([transaction]);

    expect(installment).toMatchObject({
      firstInstallmentDate: "2026-05-02T00:00:00.000Z",
      lastInstallmentDate: "2026-07-02T00:00:00.000Z",
    });
  });

  it("marks a purchase as completed when the latest observed installment is the last one", () => {
    const [installment] = buildInstallments([
      makeTransaction({
        id: "purchase-complete",
        amount: 100,
        creditCardMetadata: {
          installmentNumber: 3,
          totalInstallments: 3,
        },
      }),
    ]);

    expect(installment).toMatchObject({
      latestInstallmentNumber: 3,
      totalInstallments: 3,
      totalAmount: 300,
      paidAmount: 300,
      remainingAmount: 0,
      progressPercentage: 100,
      status: "COMPLETED",
    });
  });

  it("ignores card payments, credits, and transactions without more than one installment", () => {
    const installments = buildInstallments([
      makeTransaction({
        id: "card-payment",
        type: "CREDIT",
        creditCardMetadata: null,
      }),
      makeTransaction({
        id: "single-payment",
        creditCardMetadata: {
          installmentNumber: 1,
          totalInstallments: 1,
        },
      }),
      makeTransaction({
        id: "without-metadata",
        creditCardMetadata: null,
      }),
    ]);

    expect(installments).toEqual([]);
  });

  it("summarizes only active purchases for the in-progress tab", () => {
    const installments = buildInstallments([
      makeTransaction({
        id: "active",
        amount: 50,
        creditCardMetadata: {
          installmentNumber: 2,
          totalInstallments: 4,
        },
      }),
      makeTransaction({
        id: "completed",
        amount: 100,
        creditCardMetadata: {
          installmentNumber: 2,
          totalInstallments: 2,
        },
      }),
    ]);

    expect(summarizeInstallments(installments)).toEqual({
      activeCount: 1,
      completedCount: 1,
      totalAmount: 200,
      paidAmount: 100,
      remainingAmount: 100,
      progressPercentage: 50,
      lastInstallmentDate: "2026-05-04T12:00:00.000Z",
      currencyCode: "BRL",
    });
  });
});
