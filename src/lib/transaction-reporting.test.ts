import { describe, expect, it } from "vitest";

import {
  getConnectedAccountNumbers,
  getInternalTransferTransactionIds,
  isExcludedFromFinancialReporting,
  type ReportingTransaction,
} from "./transaction-reporting";

function makeTransaction(
  overrides: Partial<ReportingTransaction> = {},
): ReportingTransaction {
  return {
    id: "transaction",
    accountId: "account-a",
    type: "DEBIT",
    amount: 100,
    date: new Date("2026-08-10T12:00:00.000Z"),
    currencyCode: "BRL",
    category: null,
    categoryId: null,
    operationType: null,
    description: "",
    descriptionRaw: null,
    paymentData: undefined,
    ...overrides,
  };
}

describe("transaction reporting rules", () => {
  it("matches mirrored transfer transactions from different connected accounts", () => {
    const internalDebit = makeTransaction({
      id: "internal-debit",
      accountId: "account-a",
      type: "DEBIT",
      amount: 120,
      category: "Transfer - PIX",
      categoryId: "05070000",
      operationType: "PIX",
    });
    const internalCredit = makeTransaction({
      id: "internal-credit",
      accountId: "account-b",
      type: "CREDIT",
      amount: 120,
      category: "Transfers",
      categoryId: "05000000",
      operationType: "PIX",
    });
    const regularDebit = makeTransaction({
      id: "regular-debit",
      accountId: "account-a",
      type: "DEBIT",
      amount: 120,
      category: "Groceries",
      categoryId: "10000000",
    });
    const sameAccountCredit = makeTransaction({
      id: "same-account-credit",
      accountId: "account-a",
      type: "CREDIT",
      amount: 120,
      category: "Transfer - PIX",
      categoryId: "05070000",
    });

    expect(
      getInternalTransferTransactionIds([
        internalDebit,
        internalCredit,
        regularDebit,
        sameAccountCredit,
      ]),
    ).toEqual(new Set(["internal-debit", "internal-credit"]));
  });

  it("combines paired transfers with other non-spending transaction rules", () => {
    const investment = makeTransaction({
      id: "investment",
      category: "Investments",
      categoryId: "03000000",
      operationType: "APLIC_FINANCEIRA",
    });
    const samePersonTransfer = makeTransaction({
      id: "same-person-transfer",
      category: "Same person transfer - PIX",
      categoryId: "04020000",
    });

    expect(
      isExcludedFromFinancialReporting(
        makeTransaction({ id: "internal-transfer" }),
        new Set(["internal-transfer"]),
      ),
    ).toBe(true);
    expect(isExcludedFromFinancialReporting(investment, new Set())).toBe(true);
    expect(
      isExcludedFromFinancialReporting(samePersonTransfer, new Set()),
    ).toBe(true);
    expect(
      isExcludedFromFinancialReporting(
        makeTransaction({
          id: "regular-expense",
          category: "Groceries",
          categoryId: "10000000",
        }),
        new Set(),
      ),
    ).toBe(false);
  });

  it("does not reuse one debit when multiple credits share its transfer key", () => {
    const internalDebit = makeTransaction({
      id: "internal-debit",
      accountId: "account-a",
      type: "DEBIT",
      amount: 120,
      category: "Transfer - PIX",
      categoryId: "05070000",
      operationType: "PIX",
    });
    const internalCredit = makeTransaction({
      id: "internal-credit",
      accountId: "account-b",
      type: "CREDIT",
      amount: 120,
      category: "Transfers",
      categoryId: "05000000",
      operationType: "PIX",
    });
    const unrelatedCredit = makeTransaction({
      id: "unrelated-credit",
      accountId: "account-c",
      type: "CREDIT",
      amount: 120,
      category: "Transfers",
      categoryId: "05000000",
      operationType: "PIX",
    });

    expect(
      getInternalTransferTransactionIds([
        internalDebit,
        internalCredit,
        unrelatedCredit,
      ]),
    ).toEqual(new Set(["internal-debit", "internal-credit"]));
  });

  it("does not pair a transfer with a same-value non-transfer credit", () => {
    const transferDebit = makeTransaction({
      id: "transfer-debit",
      accountId: "account-a",
      type: "DEBIT",
      amount: 120,
      category: "Transfer - PIX",
      categoryId: "05070000",
      operationType: "PIX",
    });
    const regularCredit = makeTransaction({
      id: "regular-credit",
      accountId: "account-b",
      type: "CREDIT",
      amount: 120,
      category: "Salary",
      categoryId: "01010000",
      operationType: "FOLHA_PAGAMENTO",
    });

    expect(
      getInternalTransferTransactionIds([transferDebit, regularCredit]),
    ).toEqual(new Set());
  });

  it("recognizes a connected account reference without relying on date or amount", () => {
    const transferDebit = makeTransaction({
      id: "transfer-debit",
      accountId: "account-a",
      type: "DEBIT",
      amount: 120,
      category: "Transfer - PIX",
      categoryId: "05070000",
      operationType: "PIX",
      paymentData: {
        receiver: { accountNumber: "0000-2222" },
        boletoMetadata: null,
      },
      accountNumber: "1111-0000",
    });
    const transferCredit = makeTransaction({
      id: "transfer-credit",
      accountId: "account-b",
      type: "CREDIT",
      amount: 118,
      category: "Salary",
      categoryId: "01010000",
      operationType: "FOLHA_PAGAMENTO",
      paymentData: {
        payer: { accountNumber: "1111-0000" },
        boletoMetadata: null,
      },
      accountNumber: "2222",
    });

    expect(
      getInternalTransferTransactionIds([transferDebit, transferCredit]),
    ).toEqual(new Set(["transfer-debit", "transfer-credit"]));
  });

  it("keeps a same-owner credit from an unconnected account in reporting", () => {
    const externalOwnerTransfer = makeTransaction({
      accountNumber: "06037434-3",
      type: "CREDIT",
      amount: 3500,
      category: "Transfers",
      categoryId: "05000000",
      paymentData: {
        payer: {
          documentNumber: { type: "CPF", value: "463.519.118-42" },
          accountNumber: "00036773-7",
          routingNumber: "001",
        },
        receiver: {
          documentNumber: { type: "CPF", value: "46351911842" },
        },
        boletoMetadata: null,
      },
    });
    const externalSamePersonCategoryCredit = makeTransaction({
      accountNumber: "06037434-3",
      type: "CREDIT",
      amount: 1000,
      category: "Same person transfer",
      categoryId: "04000000",
      operationType: "PIX",
      paymentData: {
        payer: {
          documentNumber: { type: "CPF", value: "463.519.118-42" },
          accountNumber: "00036773-7",
          routingNumber: "001",
        },
        receiver: {
          documentNumber: { type: "CPF", value: "46351911842" },
        },
        boletoMetadata: null,
      },
    });
    const connectedOwnerTransfer = makeTransaction({
      id: "connected-owner-transfer",
      accountNumber: "06037434-3",
      type: "CREDIT",
      amount: 400,
      category: "Transfers",
      categoryId: "05000000",
      operationType: "PIX",
      paymentData: {
        payer: {
          documentNumber: { type: "CPF", value: "463.519.118-42" },
          accountNumber: "22917224-5",
        },
        receiver: {
          documentNumber: { type: "CPF", value: "46351911842" },
        },
        boletoMetadata: null,
      },
    });
    const investmentCredit = makeTransaction({
      type: "CREDIT",
      amount: 175.74,
      category: "Third party transfers",
      categoryId: "05090000",
      description: "Valor recebido de Investimentos",
    });
    const internalCardPayment = makeTransaction({
      type: "DEBIT",
      amount: 356.04,
      category: "Transfers",
      categoryId: "05000000",
      description: "Pagamento efetuado - Pagamento Fatura",
    });

    expect(
      isExcludedFromFinancialReporting(
        externalOwnerTransfer,
        new Set(),
        getConnectedAccountNumbers([{ number: "06037434-3" }]),
      ),
    ).toBe(false);
    expect(
      isExcludedFromFinancialReporting(
        externalSamePersonCategoryCredit,
        new Set(),
        getConnectedAccountNumbers([{ number: "06037434-3" }]),
      ),
    ).toBe(false);
    expect(
      isExcludedFromFinancialReporting(
        connectedOwnerTransfer,
        new Set(),
        getConnectedAccountNumbers([
          { number: "06037434-3" },
          { number: "22917224-5" },
        ]),
      ),
    ).toBe(true);
    expect(isExcludedFromFinancialReporting(investmentCredit, new Set())).toBe(
      true,
    );
    expect(
      isExcludedFromFinancialReporting(internalCardPayment, new Set()),
    ).toBe(true);
  });

  it("keeps regular external transfers and card purchases in reporting", () => {
    const externalTransfer = makeTransaction({
      type: "CREDIT",
      amount: 100,
      category: "Transfers",
      categoryId: "05000000",
      description: "Transferência Recebida|HS DO BRASIL LTDA",
      paymentData: {
        payer: {
          documentNumber: { type: "CNPJ", value: "47.123.407/0001-70" },
        },
        receiver: {
          documentNumber: { type: "CPF", value: "463.519.118-42" },
        },
        boletoMetadata: null,
      },
    });
    const cardPurchase = makeTransaction({
      type: "DEBIT",
      amount: 80,
      accountType: "CREDIT",
      accountSubtype: "CREDIT_CARD",
      category: "Shopping",
      categoryId: "08000000",
      description: "MERCADO",
    });

    expect(isExcludedFromFinancialReporting(externalTransfer, new Set())).toBe(
      false,
    );
    expect(isExcludedFromFinancialReporting(cardPurchase, new Set())).toBe(
      false,
    );
  });

  it("ignores credit card settlements without ignoring card purchases", () => {
    const cardSettlement = makeTransaction({
      id: "card-settlement",
      accountType: "CREDIT",
      accountSubtype: "CREDIT_CARD",
      type: "CREDIT",
      amount: -120,
      category: "Shopping",
      categoryId: "08000000",
      description: "PAGAMENTO ON LINE",
    });
    const cardPurchase = makeTransaction({
      id: "card-purchase",
      accountType: "CREDIT",
      accountSubtype: "CREDIT_CARD",
      type: "DEBIT",
      amount: 80,
      category: "Shopping",
      categoryId: "08000000",
      description: "MERCADO",
    });

    expect(isExcludedFromFinancialReporting(cardSettlement, new Set())).toBe(
      true,
    );
    expect(isExcludedFromFinancialReporting(cardPurchase, new Set())).toBe(
      false,
    );
  });
});
