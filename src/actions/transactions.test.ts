import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnectedAccounts: vi.fn(),
  fetchAllTransactions: vi.fn(),
  fetchItem: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/actions/pluggy", () => ({
  getConnectedAccounts: mocks.getConnectedAccounts,
}));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({
    fetchAllTransactions: mocks.fetchAllTransactions,
    fetchItem: mocks.fetchItem,
  }),
}));

import { getCurrentMonthTransactions } from "./transactions";

describe("Current month transaction action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T15:00:00-03:00"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches all pages and keeps only transactions from the current month in São Paulo time", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001/1234",
          balance: 1250.5,
          name: "Nu Pagamentos S.A. - Instituição de Pagamento",
          marketingName: "MeuPluggy",
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchItem.mockResolvedValue({
      connector: { name: "MeuPluggy" },
    });
    mocks.fetchAllTransactions.mockResolvedValue([
      {
        id: "transaction-in-month",
        accountId: "account-a",
        date: new Date("2026-08-05T12:00:00.000Z"),
        description: "Compra no mercado",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 100,
        balance: 1150.5,
        currencyCode: "BRL",
        category: "Supermercado",
        status: "POSTED",
      },
      {
        id: "transaction-at-local-month-end",
        accountId: "account-a",
        date: new Date("2026-09-01T02:30:00.000Z"),
        description: "Pagamento no fim do mês",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 50,
        balance: 1100.5,
        currencyCode: "BRL",
        category: null,
        status: "POSTED",
      },
      {
        id: "transaction-next-month",
        accountId: "account-a",
        date: new Date("2026-09-01T03:00:00.000Z"),
        description: "Compra do próximo mês",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 25,
        balance: 1075.5,
        currencyCode: "BRL",
        category: null,
        status: "POSTED",
      },
    ]);

    await expect(getCurrentMonthTransactions()).resolves.toEqual({
      month: { key: "2026-08", label: "agosto de 2026" },
      accountCount: 1,
      transactions: [
        {
          id: "transaction-at-local-month-end",
          accountId: "account-a",
          date: "2026-09-01T02:30:00.000Z",
          description: "Pagamento no fim do mês",
          type: "DEBIT",
          amount: 50,
          balance: 1100.5,
          currencyCode: "BRL",
          category: null,
          categoryLabel: "Sem categoria",
          categoryIcon: "📦",
          excludeFromSummary: false,
          status: "POSTED",
          bankName: "Nu Pagamentos S.A. - Instituição de Pagamento",
          bankLogoPath: "/assets/banks/nubank.svg",
          accountName: "MeuPluggy",
          accountNumber: "0001/1234",
        },
        {
          id: "transaction-in-month",
          accountId: "account-a",
          date: "2026-08-05T12:00:00.000Z",
          description: "Compra no mercado",
          type: "DEBIT",
          amount: 100,
          balance: 1150.5,
          currencyCode: "BRL",
          category: "Supermercado",
          categoryLabel: "Supermercado",
          categoryIcon: "🛒",
          excludeFromSummary: false,
          status: "POSTED",
          bankName: "Nu Pagamentos S.A. - Instituição de Pagamento",
          bankLogoPath: "/assets/banks/nubank.svg",
          accountName: "MeuPluggy",
          accountNumber: "0001/1234",
        },
      ],
      error: null,
    });

    expect(mocks.fetchAllTransactions).toHaveBeenCalledWith("account-a", {
      dateFrom: "2026-08-01",
      dateTo: "2026-09-01",
    });
    expect(mocks.fetchItem).toHaveBeenCalledWith("item-a");
  });

  it("returns an empty result without calling Pluggy when there are no accounts", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 0,
      error: null,
      accounts: [],
    });

    await expect(getCurrentMonthTransactions()).resolves.toMatchObject({
      month: { key: "2026-08", label: "agosto de 2026" },
      accountCount: 0,
      transactions: [],
      error: null,
    });

    expect(mocks.fetchAllTransactions).not.toHaveBeenCalled();
    expect(mocks.fetchItem).not.toHaveBeenCalled();
  });

  it("marks mirrored transfers so the summary can exclude them", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 2,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Nubank",
          marketingName: null,
          currencyCode: "BRL",
        },
        {
          id: "account-b",
          itemId: "item-b",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0002",
          balance: 1000,
          name: "Inter",
          marketingName: null,
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchItem.mockResolvedValue({ connector: { name: "Nubank" } });
    mocks.fetchAllTransactions.mockImplementation(async (accountId: string) =>
      accountId === "account-a"
        ? [
            {
              id: "internal-debit",
              accountId,
              date: new Date("2026-08-10T12:00:00.000Z"),
              description: "Transferência para minha conta Inter",
              descriptionRaw: null,
              type: "DEBIT",
              amount: 300,
              balance: 700,
              currencyCode: "BRL",
              category: "Transfer - PIX",
              categoryId: "05070000",
              operationType: "PIX",
              status: "POSTED",
            },
          ]
        : [
            {
              id: "internal-credit",
              accountId,
              date: new Date("2026-08-10T12:00:00.000Z"),
              description: "Recebimento PIX",
              descriptionRaw: null,
              type: "CREDIT",
              amount: 300,
              balance: 1300,
              currencyCode: "BRL",
              category: "Transfers",
              categoryId: "05000000",
              operationType: "PIX",
              status: "POSTED",
            },
          ],
    );

    const result = await getCurrentMonthTransactions();

    expect(result.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "internal-debit",
          categoryLabel: "Transferência - PIX",
          categoryIcon: "↔️",
          excludeFromSummary: true,
        }),
        expect.objectContaining({
          id: "internal-credit",
          categoryLabel: "Transferências",
          categoryIcon: "↔️",
          excludeFromSummary: true,
        }),
      ]),
    );
  });

  it("marks own transfers, investment movements, and card bill payments as excluded", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "account-a",
          itemId: "item-a",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001",
          balance: 1000,
          name: "Nubank",
          marketingName: null,
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchAllTransactions.mockResolvedValue([
      {
        id: "own-transfer",
        accountId: "account-a",
        date: new Date("2026-08-10T12:00:00.000Z"),
        description: "Transferência Recebida",
        descriptionRaw: null,
        type: "CREDIT",
        amount: 3500,
        balance: 3500,
        currencyCode: "BRL",
        category: "Transfers",
        categoryId: "05000000",
        operationType: "OUTROS",
        paymentData: {
          payer: {
            documentNumber: { type: "CPF", value: "463.519.118-42" },
            accountNumber: "0001",
          },
          receiver: {
            documentNumber: { type: "CPF", value: "46351911842" },
          },
          boletoMetadata: null,
        },
      },
      {
        id: "investment-credit",
        accountId: "account-a",
        date: new Date("2026-08-10T13:00:00.000Z"),
        description: "Valor recebido de Investimentos",
        descriptionRaw: null,
        type: "CREDIT",
        amount: 175.74,
        balance: 3675.74,
        currencyCode: "BRL",
        category: "Third party transfers",
        categoryId: "05090000",
        operationType: "OUTROS",
      },
      {
        id: "card-payment",
        accountId: "account-a",
        date: new Date("2026-08-10T14:00:00.000Z"),
        description: "Pagamento efetuado - Pagamento Fatura",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 356.04,
        balance: 3319.7,
        currencyCode: "BRL",
        category: "Transfers",
        categoryId: "05000000",
        operationType: "BOLETO",
      },
      {
        id: "regular-expense",
        accountId: "account-a",
        date: new Date("2026-08-10T15:00:00.000Z"),
        description: "Compra no mercado",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 80,
        balance: 3239.7,
        currencyCode: "BRL",
        category: "Groceries",
        categoryId: "10000000",
        operationType: "CARTAO",
      },
    ]);

    const result = await getCurrentMonthTransactions();

    expect(result.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "own-transfer",
          excludeFromSummary: true,
        }),
        expect.objectContaining({
          id: "investment-credit",
          excludeFromSummary: true,
        }),
        expect.objectContaining({
          id: "card-payment",
          excludeFromSummary: true,
        }),
        expect.objectContaining({
          id: "regular-expense",
          excludeFromSummary: false,
        }),
      ]),
    );
  });

  it("uses the institution identity across accounts that share an item", async () => {
    mocks.getConnectedAccounts.mockResolvedValue({
      itemCount: 1,
      error: null,
      accounts: [
        {
          id: "account-gold",
          itemId: "item-inter",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          number: "0001/0001",
          balance: 100,
          name: "GOLD",
          marketingName: null,
          currencyCode: "BRL",
        },
        {
          id: "account-inter",
          itemId: "item-inter",
          type: "BANK",
          subtype: "SAVINGS_ACCOUNT",
          number: "0001/0002",
          balance: 200,
          name: "BANCO INTER",
          marketingName: null,
          currencyCode: "BRL",
        },
      ],
    });
    mocks.fetchItem.mockResolvedValue({
      connector: { name: "MeuPluggy" },
    });
    mocks.fetchAllTransactions.mockImplementation(async (accountId: string) => [
      {
        id: `transaction-${accountId}`,
        accountId,
        date: new Date("2026-08-05T12:00:00.000Z"),
        description: "Movimentação de teste",
        descriptionRaw: null,
        type: "DEBIT",
        amount: 10,
        balance: 100,
        currencyCode: "BRL",
        category: "Testes",
        status: "POSTED",
      },
    ]);

    const result = await getCurrentMonthTransactions();

    expect(result.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "transaction-account-gold",
          bankName: "BANCO INTER",
          bankLogoPath: "/assets/banks/inter.svg",
        }),
        expect.objectContaining({
          id: "transaction-account-inter",
          bankName: "BANCO INTER",
          bankLogoPath: "/assets/banks/inter.svg",
        }),
      ]),
    );
    expect(mocks.fetchItem).toHaveBeenCalledTimes(1);
  });
});
