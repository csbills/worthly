"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CurrencyCode } from "pluggy-sdk";

import { prisma } from "@/lib/prisma";

const investmentsPath = "/investments";

const manualCryptoCurrencyCodes = [
  "BRL",
  "USD",
  "EUR",
] as const satisfies readonly CurrencyCode[];

export type ManualCryptoCurrency = (typeof manualCryptoCurrencyCodes)[number];

export type ManualCryptoAsset = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number | null;
  currentPrice: number;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  currencyCode: ManualCryptoCurrency;
  updatedAt: string;
};

export type ManualCryptoAssetsResult = {
  assets: ManualCryptoAsset[];
  error: string | null;
};

function isManualCryptoCurrency(value: string): value is ManualCryptoCurrency {
  return manualCryptoCurrencyCodes.includes(value as ManualCryptoCurrency);
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function getFormNumber(formData: FormData, name: string) {
  const value = getFormString(formData, name);

  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function serializeDate(date: Date) {
  return date.toISOString();
}

function serializeAsset(asset: {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number | null;
  currentPrice: number;
  currencyCode: string;
  updatedAt: Date;
}): ManualCryptoAsset {
  const currencyCode = isManualCryptoCurrency(asset.currencyCode)
    ? asset.currencyCode
    : "BRL";
  const balance = asset.quantity * asset.currentPrice;
  const amountOriginal =
    asset.averagePrice === null ? null : asset.quantity * asset.averagePrice;

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    quantity: asset.quantity,
    averagePrice: asset.averagePrice,
    currentPrice: asset.currentPrice,
    balance,
    amountOriginal,
    amountProfit: amountOriginal === null ? null : balance - amountOriginal,
    currencyCode,
    updatedAt: serializeDate(asset.updatedAt),
  };
}

export async function getManualCryptoAssets(): Promise<ManualCryptoAssetsResult> {
  try {
    const assets = await prisma.manualCryptoAsset.findMany({
      orderBy: [{ currencyCode: "asc" }, { symbol: "asc" }],
    });

    return {
      assets: assets.map(serializeAsset),
      error: null,
    };
  } catch {
    return {
      assets: [],
      error: "Não foi possível carregar os criptoativos cadastrados.",
    };
  }
}

export async function saveManualCryptoAsset(
  formData: FormData,
): Promise<never> {
  const symbol = getFormString(formData, "symbol").toLocaleUpperCase("pt-BR");
  const name = getFormString(formData, "name") || symbol;
  const quantity = getFormNumber(formData, "quantity");
  const averagePrice = getFormNumber(formData, "averagePrice");
  const currentPrice = getFormNumber(formData, "currentPrice");
  const currencyValue = getFormString(formData, "currencyCode");

  if (
    !/^[A-Z0-9][A-Z0-9._-]{0,11}$/.test(symbol) ||
    name.length > 100 ||
    quantity === null ||
    quantity <= 0 ||
    currentPrice === null ||
    currentPrice <= 0 ||
    (averagePrice !== null && averagePrice <= 0) ||
    !isManualCryptoCurrency(currencyValue)
  ) {
    redirect(`${investmentsPath}?crypto=invalid`);
  }

  try {
    await prisma.manualCryptoAsset.upsert({
      where: {
        symbol_currencyCode: {
          symbol,
          currencyCode: currencyValue,
        },
      },
      create: {
        symbol,
        name,
        quantity,
        averagePrice,
        currentPrice,
        currencyCode: currencyValue,
      },
      update: {
        name,
        quantity,
        averagePrice,
        currentPrice,
      },
    });
  } catch {
    redirect(`${investmentsPath}?crypto=error`);
  }

  revalidatePath(investmentsPath);
  redirect(`${investmentsPath}?crypto=saved`);
}
