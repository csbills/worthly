import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    pluggyItem: {
      findMany: vi.fn(),
    },
  },
  fetchInvestments: vi.fn(),
  fetchAllInvestmentTransactions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/pluggy", () => ({
  getPluggyClient: () => ({
    fetchInvestments: mocks.fetchInvestments,
    fetchAllInvestmentTransactions: mocks.fetchAllInvestmentTransactions,
  }),
}));

import { getInvestments } from "./investments";

describe("Investments action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAllInvestmentTransactions.mockResolvedValue([]);
  });

  it("fetches every investment page and groups positions by currency and category", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([
      { itemId: "pluggy-item-a" },
    ]);
    mocks.fetchInvestments
      .mockResolvedValueOnce({
        page: 1,
        total: 3,
        totalPages: 2,
        results: [
          {
            id: "investment-fixed-income",
            itemId: "pluggy-item-a",
            name: "CDB Banco",
            type: "FIXED_INCOME",
            subtype: "CDB",
            currencyCode: "BRL",
            balance: 1000,
            amount: 1020,
            amountOriginal: 900,
            amountProfit: 120,
            amountWithdrawal: 1000,
            quantity: 1,
            value: 1020,
            rate: 100,
            rateType: "CDI",
            annualRate: null,
            lastTwelveMonthsRate: null,
            date: new Date("2026-08-28T12:00:00.000Z"),
            dueDate: new Date("2027-08-28T12:00:00.000Z"),
            institution: { name: "Banco", number: null },
            issuer: "Banco",
          },
          {
            id: "investment-equity",
            itemId: "pluggy-item-a",
            name: "ETF Brasil",
            type: "EQUITY",
            subtype: "ETF",
            currencyCode: "BRL",
            balance: 500,
            amount: 500,
            amountOriginal: null,
            amountProfit: -20,
            amountWithdrawal: 500,
            quantity: 10,
            value: 50,
            rate: null,
            rateType: null,
            annualRate: null,
            lastTwelveMonthsRate: 8.5,
            date: null,
            dueDate: null,
            institution: { name: "Corretora", number: null },
            issuer: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        page: 2,
        total: 3,
        totalPages: 2,
        results: [
          {
            id: "investment-usd",
            itemId: "pluggy-item-a",
            name: "US Treasury",
            type: "FIXED_INCOME",
            subtype: "TREASURY",
            currencyCode: "USD",
            balance: 200,
            amount: 200,
            amountOriginal: 180,
            amountProfit: 20,
            amountWithdrawal: 200,
            quantity: 2,
            value: 100,
            rate: null,
            rateType: "DOLAR",
            annualRate: null,
            lastTwelveMonthsRate: null,
            date: null,
            dueDate: null,
            institution: null,
            issuer: "United States",
          },
        ],
      });

    const result = await getInvestments();

    expect(mocks.fetchInvestments).toHaveBeenNthCalledWith(
      1,
      "pluggy-item-a",
      undefined,
      { page: 1, pageSize: 500 },
    );
    expect(mocks.fetchInvestments).toHaveBeenNthCalledWith(
      2,
      "pluggy-item-a",
      undefined,
      { page: 2, pageSize: 500 },
    );
    expect(result).toMatchObject({
      itemCount: 1,
      error: null,
      investments: [
        expect.objectContaining({
          id: "investment-fixed-income",
          date: "2026-08-28T12:00:00.000Z",
          dueDate: "2027-08-28T12:00:00.000Z",
          fixedAnnualRate: null,
          institutionName: "Banco",
        }),
        expect.objectContaining({
          id: "investment-equity",
          amountProfit: -20,
          institutionName: "Corretora",
        }),
        expect.objectContaining({
          id: "investment-usd",
          currencyCode: "USD",
          institutionName: null,
        }),
      ],
      currencies: [
        {
          currencyCode: "BRL",
          balance: 1500,
          amountOriginal: 900,
          amountProfit: 100,
          categories: [
            {
              key: "FIXED_INCOME",
              label: "Renda fixa",
              count: 1,
              balance: 1000,
              amountOriginal: 900,
              amountProfit: 120,
            },
            {
              key: "EQUITY",
              label: "Renda variável",
              count: 1,
              balance: 500,
              amountOriginal: null,
              amountProfit: -20,
            },
          ],
        },
        {
          currencyCode: "USD",
          balance: 200,
          amountOriginal: 180,
          amountProfit: 20,
          categories: [
            {
              key: "FIXED_INCOME",
              label: "Renda fixa",
              count: 1,
              balance: 200,
              amountOriginal: 180,
              amountProfit: 20,
            },
          ],
        },
      ],
    });
  });

  it("fills missing result and proventos from investment transactions", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([
      { itemId: "pluggy-item-a" },
    ]);
    mocks.fetchInvestments.mockResolvedValue({
      page: 1,
      total: 1,
      totalPages: 1,
      results: [
        {
          id: "investment-equity",
          itemId: "pluggy-item-a",
          name: "PETR4",
          type: "EQUITY",
          subtype: "STOCK",
          currencyCode: "BRL",
          balance: 1100,
          amount: 1100,
          amountOriginal: null,
          amountProfit: null,
          amountWithdrawal: 1125,
          quantity: 10,
          value: 110,
          rate: null,
          rateType: null,
          annualRate: null,
          lastTwelveMonthsRate: null,
          date: null,
          dueDate: null,
          institution: { name: "Corretora", number: null },
          issuer: null,
        },
      ],
    });
    mocks.fetchAllInvestmentTransactions.mockResolvedValue([
      {
        type: "BUY",
        amount: 1000,
        netAmount: 1000,
        quantity: 10,
        value: 100,
      },
      {
        type: "INTEREST",
        amount: 25,
        netAmount: 25,
        quantity: null,
        value: null,
      },
    ]);

    const result = await getInvestments();

    expect(mocks.fetchAllInvestmentTransactions).toHaveBeenCalledWith(
      "investment-equity",
    );
    expect(result.investments[0]).toMatchObject({
      amountOriginal: 1000,
      amountProfit: 125,
      income: 25,
    });
    expect(result.currencies[0]).toMatchObject({
      amountOriginal: 1000,
      amountProfit: 125,
      income: 25,
      categories: [
        expect.objectContaining({
          amountOriginal: 1000,
          amountProfit: 125,
          income: 25,
        }),
      ],
    });
  });

  it("returns an empty result without calling Pluggy when no item is saved", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([]);

    await expect(getInvestments()).resolves.toEqual({
      itemCount: 0,
      investments: [],
      currencies: [],
      error: null,
    });

    expect(mocks.fetchInvestments).not.toHaveBeenCalled();
  });

  it("keeps successful items and reports when one item cannot be loaded", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([
      { itemId: "pluggy-item-a" },
      { itemId: "pluggy-item-b" },
    ]);
    mocks.fetchInvestments
      .mockResolvedValueOnce({
        page: 1,
        total: 1,
        totalPages: 1,
        results: [
          {
            id: "investment-a",
            itemId: "pluggy-item-a",
            name: "Tesouro",
            type: "FIXED_INCOME",
            subtype: "TREASURY",
            currencyCode: "BRL",
            balance: 300,
            amount: null,
            amountOriginal: null,
            amountProfit: null,
            amountWithdrawal: null,
            quantity: null,
            value: null,
            rate: null,
            rateType: null,
            annualRate: null,
            lastTwelveMonthsRate: null,
            date: null,
            dueDate: null,
            institution: null,
            issuer: null,
          },
        ],
      })
      .mockRejectedValueOnce(new Error("Pluggy unavailable"));

    const result = await getInvestments();

    expect(result.investments).toHaveLength(1);
    expect(result.error).toBe(
      "Não foi possível carregar uma ou mais conexões. Verifique o status no Meu Pluggy.",
    );
  });

  it("consolidates positions from the same issuer while preserving lot count and varied terms", async () => {
    mocks.prisma.pluggyItem.findMany.mockResolvedValue([
      { itemId: "pluggy-item-a" },
    ]);
    mocks.fetchInvestments.mockResolvedValue({
      page: 1,
      total: 2,
      totalPages: 1,
      results: [
        {
          id: "investment-lot-a",
          itemId: "pluggy-item-a",
          name: "CDB Banco",
          type: "FIXED_INCOME",
          subtype: "CDB",
          currencyCode: "BRL",
          balance: 1000,
          amount: 1000,
          amountOriginal: 900,
          amountProfit: 100,
          amountWithdrawal: 1000,
          quantity: 1,
          value: 1000,
          rate: 100,
          rateType: "CDI",
          fixedAnnualRate: 12,
          annualRate: null,
          lastTwelveMonthsRate: null,
          date: new Date("2026-08-28T12:00:00.000Z"),
          dueDate: new Date("2027-08-28T12:00:00.000Z"),
          institution: { name: "Banco", number: null },
          issuer: "Banco",
        },
        {
          id: "investment-lot-b",
          itemId: "pluggy-item-a",
          name: "CDB Banco",
          type: "FIXED_INCOME",
          subtype: "CDB",
          currencyCode: "BRL",
          balance: 500,
          amount: 500,
          amountOriginal: 450,
          amountProfit: 50,
          amountWithdrawal: 500,
          quantity: 1,
          value: 500,
          rate: 105,
          rateType: "CDI",
          fixedAnnualRate: 13,
          annualRate: null,
          lastTwelveMonthsRate: null,
          date: new Date("2026-08-29T12:00:00.000Z"),
          dueDate: new Date("2028-08-29T12:00:00.000Z"),
          institution: { name: "Banco", number: null },
          issuer: "Banco",
        },
      ],
    });

    const result = await getInvestments();

    expect(result.investments).toHaveLength(1);
    expect(result.investments[0]).toMatchObject({
      id: "investment-lot-a",
      positionCount: 2,
      balance: 1500,
      amountOriginal: 1350,
      amountProfit: 150,
      date: "2026-08-29T12:00:00.000Z",
      dueDate: null,
      hasMultipleDueDates: true,
      rate: null,
      rateType: null,
      fixedAnnualRate: null,
      hasMultipleRates: true,
    });
    expect(result.currencies).toMatchObject([
      {
        currencyCode: "BRL",
        balance: 1500,
        lots: 2,
        categories: [
          {
            key: "FIXED_INCOME",
            count: 1,
            lots: 2,
            balance: 1500,
          },
        ],
      },
    ]);
  });
});
