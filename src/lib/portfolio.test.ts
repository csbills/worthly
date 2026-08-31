import { describe, expect, it } from "vitest";

import {
  buildPortfolioAssets,
  buildPortfolioSnapshotData,
  summarizePortfolioAssets,
} from "./portfolio";

describe("Portfolio aggregation", () => {
  it("calculates average prices for stocks, ETFs, and crypto positions", () => {
    const assets = buildPortfolioAssets(
      [
        {
          id: "pluggy-stock",
          itemId: "item-a",
          name: "PETR4",
          type: "EQUITY",
          subtype: "STOCK",
          currencyCode: "BRL",
          balance: 1200,
          amountOriginal: 1000,
          amountProfit: 200,
          quantity: 20,
          institutionName: "Corretora",
          issuer: "Petrobras",
          positionCount: 1,
          dueDate: null,
        },
        {
          id: "pluggy-etf",
          itemId: "item-a",
          name: "B5P211",
          type: "ETF",
          subtype: "ETF",
          currencyCode: "BRL",
          balance: 600,
          amountOriginal: 500,
          amountProfit: 100,
          quantity: 5,
          institutionName: "Corretora",
          issuer: "B5P211",
          positionCount: 1,
          dueDate: null,
        },
        {
          id: "pluggy-fixed-income",
          itemId: "item-a",
          name: "CDB",
          type: "FIXED_INCOME",
          subtype: "CDB",
          currencyCode: "BRL",
          balance: 1100,
          amountOriginal: 1000,
          amountProfit: 100,
          quantity: 10,
          institutionName: "Banco",
          issuer: "Banco",
          positionCount: 1,
          dueDate: null,
        },
      ],
      [
        {
          id: "manual-bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 9.9,
          averagePrice: null,
          currentPrice: 120,
          purchaseTotal: 990,
          amountOriginal: 990,
          amountProfit: 198,
          amountProfitPercentage: 20,
          currencyCode: "BRL",
          coingeckoId: "bitcoin",
          priceSource: "CoinGecko",
          priceUpdatedAt: "2026-08-30T12:00:00.000Z",
          updatedAt: "2026-08-30T12:00:00.000Z",
        },
      ],
    );

    expect(assets.find((asset) => asset.name === "PETR4")).toMatchObject({
      averagePrice: 50,
    });
    expect(assets.find((asset) => asset.name === "B5P211")).toMatchObject({
      averagePrice: 100,
    });
    expect(assets.find((asset) => asset.symbol === "BTC")).toMatchObject({
      averagePrice: 100,
    });
    expect(assets.find((asset) => asset.name === "CDB")).toMatchObject({
      averagePrice: null,
    });
  });

  it("unifies Pluggy and manual assets and calculates category and asset shares", () => {
    const assets = buildPortfolioAssets(
      [
        {
          id: "pluggy-fixed-income",
          itemId: "item-a",
          name: "CDB - NU FINANCEIRA S.A.",
          type: "FIXED_INCOME",
          subtype: "CDB",
          currencyCode: "BRL",
          balance: 6000,
          amountOriginal: 5500,
          amountProfit: 500,
          quantity: 6,
          institutionName: "NU FINANCEIRA S.A.",
          issuer: "NU FINANCEIRA S.A.",
          positionCount: 2,
          dueDate: "2027-08-28T00:00:00.000Z",
        },
      ],
      [
        {
          id: "manual-bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 1,
          averagePrice: 3000,
          currentPrice: 4000,
          purchaseTotal: 3000,
          amountOriginal: 3000,
          amountProfit: 1000,
          amountProfitPercentage: 33.3333,
          currencyCode: "BRL",
          coingeckoId: "bitcoin",
          priceSource: "CoinGecko",
          priceUpdatedAt: "2026-08-30T12:00:00.000Z",
          updatedAt: "2026-08-30T12:00:00.000Z",
        },
        {
          id: "manual-ethereum",
          symbol: "ETH",
          name: "Ethereum",
          quantity: 1,
          averagePrice: 1000,
          currentPrice: 1000,
          purchaseTotal: 1000,
          amountOriginal: 1000,
          amountProfit: 0,
          amountProfitPercentage: 0,
          currencyCode: "BRL",
          coingeckoId: "ethereum",
          priceSource: "CoinGecko",
          priceUpdatedAt: "2026-08-30T12:00:00.000Z",
          updatedAt: "2026-08-30T12:00:00.000Z",
        },
      ],
    );

    const [currency] = summarizePortfolioAssets(assets);
    const fixedIncome = currency.categories.find(
      (category) => category.key === "FIXED_INCOME",
    );
    const fixedIncomeAsset = fixedIncome?.assets[0];
    const crypto = currency.categories.find(
      (category) => category.key === "CRYPTO",
    );
    const bitcoin = crypto?.assets.find((asset) => asset.symbol === "BTC");

    expect(assets).toHaveLength(3);
    expect(currency.balance).toBe(11000);
    expect(currency.amountOriginal).toBe(9500);
    expect(currency.amountProfit).toBe(1500);
    expect(fixedIncome).toMatchObject({
      balance: 6000,
      percentageOfPortfolio: (6000 / 11000) * 100,
      assetCount: 1,
      lots: 2,
    });
    expect(fixedIncomeAsset).toMatchObject({
      logoPath: "/assets/banks/nubank.svg",
    });
    expect(crypto).toMatchObject({
      balance: 5000,
      percentageOfPortfolio: (5000 / 11000) * 100,
      assetCount: 2,
    });
    expect(bitcoin).toMatchObject({
      balance: 4000,
      percentageOfCategory: 80,
      percentageOfPortfolio: (4000 / 11000) * 100,
      logoPath: "/assets/crypto/bitcoin.svg",
    });
  });

  it("adds manual stocks, FIIs, and ETFs to the matching portfolio category", () => {
    const assets = buildPortfolioAssets(
      [],
      [],
      [
        {
          id: "manual-mxrf11",
          symbol: "MXRF11",
          name: "Maxi Renda",
          assetType: "FII",
          categoryKey: "EQUITY",
          subtype: "REAL_ESTATE_FUND",
          quantity: 10,
          averagePrice: 100,
          currentPrice: 110,
          balance: 1100,
          amountOriginal: 1000,
          amountProfit: 100,
          amountProfitPercentage: 10,
          currencyCode: "BRL",
          priceSource: "Yahoo Finance",
          priceUpdatedAt: "2026-08-30T18:00:00.000Z",
          history: [],
          orders: [],
          realizedProfit: 0,
          orderCount: 1,
          updatedAt: "2026-08-30T18:00:00.000Z",
        },
      ],
    );

    const [currency] = summarizePortfolioAssets(assets);
    const equity = currency.categories.find(
      (category) => category.key === "EQUITY",
    );

    expect(assets).toHaveLength(1);
    expect(equity).toMatchObject({
      assetCount: 1,
      balance: 1100,
      assets: [
        expect.objectContaining({
          symbol: "MXRF11",
          source: "manual",
          categoryKey: "EQUITY",
          subtype: "REAL_ESTATE_FUND",
          logoPath: "/assets/market/placeholders/fii.svg",
        }),
      ],
    });
  });

  it("creates one daily snapshot payload per currency with category totals", () => {
    const assets = buildPortfolioAssets(
      [
        {
          id: "pluggy-usd",
          itemId: "item-a",
          name: "US Treasury",
          type: "FIXED_INCOME",
          subtype: "TREASURY",
          currencyCode: "USD",
          balance: 250,
          amountOriginal: 200,
          amountProfit: 50,
          quantity: 2,
          institutionName: "Broker",
          issuer: "United States",
          positionCount: 1,
          dueDate: null,
        },
      ],
      [],
    );
    const [currency] = summarizePortfolioAssets(assets);

    expect(buildPortfolioSnapshotData([currency], "2026-08-30")).toEqual([
      {
        snapshotDate: "2026-08-30",
        currencyCode: "USD",
        balance: 250,
        amountOriginal: 200,
        amountProfit: 50,
        categories: [
          {
            categoryKey: "FIXED_INCOME",
            balance: 250,
            amountOriginal: 200,
            amountProfit: 50,
            assetCount: 1,
          },
        ],
      },
    ]);
  });
});
