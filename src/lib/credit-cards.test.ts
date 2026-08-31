import { describe, expect, it } from "vitest";

import { formatCreditCardDueDate, normalizeCreditCard } from "./credit-cards";

describe("credit card normalization", () => {
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
      statementAmount: 1169.94,
      dueDate: "2026-09-02T00:00:00.000Z",
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
      statementAmount: 320,
      creditLimit: null,
      usedAmount: 320,
      availableAmount: null,
      dueDate: null,
      status: null,
    });
  });

  it("formats date-only due dates without shifting the calendar day", () => {
    expect(formatCreditCardDueDate("2026-09-02T00:00:00.000Z")).toBe(
      "02 de set.",
    );
  });
});
