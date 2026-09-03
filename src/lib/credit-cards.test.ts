import { describe, expect, it } from "vitest";

import {
  calculateNextBillInProgress,
  formatCreditCardDueDate,
  normalizeCreditCard,
} from "./credit-cards";

describe("credit card normalization", () => {
  it("calculates the next invoice from purchases after the last closing date", () => {
    const account = {
      creditData: {
        balanceCloseDate: new Date("2026-08-25T00:00:00.000Z"),
        balanceDueDate: new Date("2026-09-02T00:00:00.000Z"),
      },
    } as never;
    const latestClosedBill = {
      id: "bill-2026-08",
      amount: 1196.6,
      closingDate: "2026-08-25T00:00:00.000Z",
      dueDate: "2026-09-02T00:00:00.000Z",
    };
    const transactions = [
      {
        id: "on-closing-date",
        date: new Date("2026-08-25T03:00:00.000Z"),
        type: "DEBIT",
        amount: 100,
        creditCardMetadata: null,
      },
      {
        id: "after-closing-date",
        date: new Date("2026-08-26T03:00:00.000Z"),
        type: "DEBIT",
        amount: 75,
        creditCardMetadata: null,
      },
      {
        id: "next-invoice-purchase",
        date: new Date("2026-09-10T03:00:00.000Z"),
        type: "DEBIT",
        amount: 125,
        creditCardMetadata: null,
      },
      {
        id: "pending-purchase",
        date: new Date("2026-09-05T03:00:00.000Z"),
        type: "DEBIT",
        amount: 20,
        creditCardMetadata: null,
      },
      {
        id: "on-next-closing-date",
        date: new Date("2026-09-25T03:00:00.000Z"),
        type: "DEBIT",
        amount: 300,
        creditCardMetadata: null,
      },
      {
        id: "refund",
        date: new Date("2026-09-10T03:00:00.000Z"),
        type: "CREDIT",
        amount: 50,
        creditCardMetadata: null,
      },
    ] as never;

    expect(
      calculateNextBillInProgress(
        account,
        latestClosedBill,
        transactions,
        new Date("2026-09-15T12:00:00.000Z"),
      ),
    ).toEqual({
      amount: 220,
      transactionCount: 3,
      closingDate: "2026-09-25T00:00:00.000Z",
      dueDate: "2026-10-02T00:00:00.000Z",
    });
  });

  it("advances a stale cycle to the next closing date after today", () => {
    const account = {
      creditData: {
        balanceCloseDate: new Date("2026-08-25T00:00:00.000Z"),
        balanceDueDate: new Date("2026-09-02T00:00:00.000Z"),
      },
    } as never;
    const latestClosedBill = {
      id: "bill-2026-08",
      amount: 1196.6,
      closingDate: "2026-08-25T00:00:00.000Z",
      dueDate: "2026-09-02T00:00:00.000Z",
    };

    expect(
      calculateNextBillInProgress(
        account,
        latestClosedBill,
        [
          {
            id: "stale-cycle-purchase",
            date: new Date("2026-09-26T03:00:00.000Z"),
            type: "DEBIT",
            amount: 50,
            creditCardMetadata: null,
          },
        ] as never,
        new Date("2026-10-01T12:00:00.000Z"),
      ),
    ).toEqual({
      amount: 50,
      transactionCount: 1,
      closingDate: "2026-10-25T00:00:00.000Z",
      dueDate: "2026-11-02T00:00:00.000Z",
    });
  });

  it("uses the latest closed bill as the authoritative invoice and rejects a stale open due date", () => {
    const account = {
      id: "credit-card-santander",
      itemId: "item-santander",
      type: "CREDIT",
      subtype: "CREDIT_CARD",
      number: "****1234",
      balance: 920.06,
      name: "SANTANDER SX MASTER",
      marketingName: null,
      currencyCode: "BRL",
      creditData: {
        level: "MASTER",
        brand: "MASTERCARD",
        balanceCloseDate: null,
        balanceDueDate: new Date("2026-08-01T00:00:00.000Z"),
        availableCreditLimit: 1165.94,
        balanceForeignCurrency: null,
        minimumPayment: 119.66,
        creditLimit: 2086,
        isLimitFlexible: false,
        status: "ACTIVE",
        holderType: "MAIN",
      },
    } as never;
    const latestBill = {
      id: "bill-2026-08",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      billClosingDate: new Date("2026-08-25T00:00:00.000Z"),
      totalAmount: 1196.6,
      totalAmountCurrencyCode: "BRL",
      minimumPaymentAmount: 119.66,
      allowsInstallments: true,
      financeCharges: [],
      payments: [],
      createdAt: new Date("2026-08-26T00:00:00.000Z"),
      updatedAt: new Date("2026-08-26T00:00:00.000Z"),
    };
    const olderBill = {
      ...latestBill,
      id: "bill-2026-07",
      dueDate: new Date("2026-08-01T00:00:00.000Z"),
      billClosingDate: new Date("2026-07-25T00:00:00.000Z"),
      totalAmount: 980,
    };

    expect(
      normalizeCreditCard(
        account,
        {
          bankName: "Santander",
          bankLogoPath: "/assets/banks/santander.svg",
        },
        [olderBill, latestBill],
        new Date("2026-09-01T12:00:00.000Z"),
      ),
    ).toMatchObject({
      openBalanceAmount: 920.06,
      openDueDate: null,
      latestClosedBill: {
        id: "bill-2026-08",
        amount: 1196.6,
        closingDate: "2026-08-25T00:00:00.000Z",
        dueDate: "2026-09-01T00:00:00.000Z",
      },
    });
  });

  it("normalizes the Pluggy credit fields for the dashboard", () => {
    const account = {
      id: "credit-card-a",
      itemId: "item-a",
      type: "CREDIT",
      subtype: "CREDIT_CARD",
      number: "****8896",
      balance: 1169.94,
      name: "GOLD",
      marketingName: null,
      currencyCode: "BRL",
      creditData: {
        level: "GOLD",
        brand: "MASTERCARD",
        balanceDueDate: new Date("2026-09-02T00:00:00.000Z"),
        availableCreditLimit: 235.11,
        creditLimit: 1405.05,
        status: "ACTIVE",
      },
    } as never;

    expect(
      normalizeCreditCard(account, {
        bankName: "Inter",
        bankLogoPath: "/assets/banks/inter.svg",
      }),
    ).toEqual({
      id: "credit-card-a",
      itemId: "item-a",
      name: "GOLD",
      level: "GOLD",
      brand: "MASTERCARD",
      bankName: "Inter",
      bankLogoPath: "/assets/banks/inter.svg",
      lastFourDigits: "8896",
      openBalanceAmount: 1169.94,
      openDueDate: "2026-09-02T00:00:00.000Z",
      latestClosedBill: null,
      nextBillInProgress: null,
      billError: null,
      nextBillError: null,
      creditLimit: 1405.05,
      usedAmount: 1169.94,
      availableAmount: 235.11,
      currencyCode: "BRL",
      status: "ACTIVE",
    });
  });

  it("falls back to the account balance when the limit data is unavailable", () => {
    const account = {
      id: "credit-card-b",
      itemId: "item-b",
      type: "CREDIT",
      subtype: "CREDIT_CARD",
      number: "1234",
      balance: -320,
      name: "Cartão principal",
      marketingName: null,
      currencyCode: "BRL",
      creditData: null,
    } as never;

    expect(
      normalizeCreditCard(account, {
        bankName: "Nubank",
        bankLogoPath: "/assets/banks/nubank.svg",
      }),
    ).toMatchObject({
      lastFourDigits: "1234",
      openBalanceAmount: 320,
      creditLimit: null,
      usedAmount: 320,
      availableAmount: null,
      openDueDate: null,
      latestClosedBill: null,
      billError: null,
      status: null,
    });
  });

  it("formats date-only due dates without shifting the calendar day", () => {
    expect(formatCreditCardDueDate("2026-09-02T00:00:00.000Z")).toBe(
      "02 de set.",
    );
  });
});
