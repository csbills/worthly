"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import {
  type CryptoOrder,
  calculateCryptoOrderQuantity,
  calculateCryptoPosition,
  InsufficientCryptoQuantityError,
} from "@/lib/crypto-orders";
import { findSupportedMarketAsset } from "@/lib/market-assets";
import { prisma } from "@/lib/prisma";

const investmentsPath = "/investments";

class InvalidMarketOrderError extends Error {
  constructor() {
    super("A ordem de ativo de mercado é inválida.");
    this.name = "InvalidMarketOrderError";
  }
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

function parseOrderDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function toMarketOrder(order: {
  id: string;
  side: string;
  orderDate: Date;
  total: number;
  brokerFee: number;
  unitPrice: number;
  createdAt: Date;
}): CryptoOrder {
  return {
    id: order.id,
    side: order.side === "SELL" ? "SELL" : "BUY",
    orderDate: order.orderDate.toISOString().slice(0, 10),
    total: order.total,
    brokerFee: order.brokerFee,
    unitPrice: order.unitPrice,
    createdAt: order.createdAt.toISOString(),
  };
}

function getStoredAssetOrders(asset: {
  id: string;
  quantity: number;
  averagePrice: number | null;
  createdAt: Date;
  orders?: Array<{
    id: string;
    side: string;
    orderDate: Date;
    total: number;
    brokerFee: number;
    unitPrice: number;
    createdAt: Date;
  }>;
}): CryptoOrder[] {
  return asset.orders?.map(toMarketOrder) ?? [];
}

function getOrderData(
  assetId: string,
  side: "BUY" | "SELL",
  orderDate: Date,
  total: number,
  brokerFee: number,
  unitPrice: number,
  quantity: number,
) {
  return {
    assetId,
    side,
    orderDate,
    total,
    brokerFee,
    unitPrice,
    quantity,
  };
}

export async function saveManualMarketOrder(
  formData: FormData,
): Promise<never> {
  await verifySession();

  const orderId = getFormString(formData, "orderId") || null;
  const assetId = getFormString(formData, "assetId");
  const asset = findSupportedMarketAsset(assetId);
  const sideValue = getFormString(formData, "side");
  const side = sideValue === "SELL" || sideValue === "BUY" ? sideValue : null;
  const orderDateValue = getFormString(formData, "orderDate");
  const orderDate = parseOrderDate(orderDateValue);
  const total = getFormNumber(formData, "total");
  const brokerFeeInput = getFormString(formData, "brokerFee");
  const brokerFee = brokerFeeInput ? getFormNumber(formData, "brokerFee") : 0;
  const unitPrice = getFormNumber(formData, "unitPrice");

  if (
    !asset ||
    !side ||
    !orderDate ||
    total === null ||
    total <= 0 ||
    brokerFee === null ||
    brokerFee < 0 ||
    brokerFee >= total ||
    unitPrice === null ||
    unitPrice <= 0
  ) {
    redirect(`${investmentsPath}?market=invalid-order`);
  }

  const quantity = calculateCryptoOrderQuantity(total, brokerFee, unitPrice);
  const now = new Date().toISOString();

  try {
    await prisma.$transaction(async (tx) => {
      let targetAsset: {
        id: string;
        symbol: string;
        name: string;
        assetType: string;
        createdAt: Date;
        quantity: number;
        averagePrice: number | null;
        currentPrice: number | null;
        currencyCode: string;
        orders?: Array<{
          id: string;
          side: string;
          orderDate: Date;
          total: number;
          brokerFee: number;
          unitPrice: number;
          createdAt: Date;
        }>;
      };
      let orders: CryptoOrder[];
      let currentOrder: { createdAt: Date } | null = null;

      if (orderId) {
        const existingOrder = await tx.manualMarketOrder.findUnique({
          where: { id: orderId },
          include: {
            asset: {
              include: {
                orders: {
                  orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
                },
              },
            },
          },
        });

        if (!existingOrder || existingOrder.asset.symbol !== asset.symbol) {
          throw new InvalidMarketOrderError();
        }

        targetAsset = existingOrder.asset;
        currentOrder = existingOrder;
        orders = getStoredAssetOrders(targetAsset).filter(
          (order) => order.id !== orderId,
        );
      } else {
        const existingAsset = await tx.manualMarketAsset.findUnique({
          where: {
            symbol_currencyCode: {
              symbol: asset.symbol,
              currencyCode: "BRL",
            },
          },
          include: {
            orders: {
              orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
            },
          },
        });

        targetAsset =
          existingAsset ??
          (await tx.manualMarketAsset.create({
            data: {
              symbol: asset.symbol,
              name: asset.name,
              assetType: asset.assetType,
              quantity: 0,
              averagePrice: null,
              currentPrice: null,
              currencyCode: "BRL",
            },
          }));
        orders = getStoredAssetOrders(targetAsset);
      }

      const candidateOrder: CryptoOrder = {
        id: orderId ?? undefined,
        side,
        orderDate: orderDateValue,
        total,
        brokerFee,
        unitPrice,
        createdAt: currentOrder?.createdAt.toISOString() ?? now,
      };
      const position = calculateCryptoPosition([...orders, candidateOrder]);

      if (orderId) {
        await tx.manualMarketOrder.update({
          where: { id: orderId },
          data: getOrderData(
            targetAsset.id,
            side,
            orderDate,
            total,
            brokerFee,
            unitPrice,
            quantity,
          ),
        });
      } else {
        await tx.manualMarketOrder.create({
          data: getOrderData(
            targetAsset.id,
            side,
            orderDate,
            total,
            brokerFee,
            unitPrice,
            quantity,
          ),
        });
      }

      await tx.manualMarketAsset.update({
        where: { id: targetAsset.id },
        data: {
          name: asset.name,
          assetType: asset.assetType,
          quantity: position.quantity,
          averagePrice: position.averagePrice,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof InsufficientCryptoQuantityError ||
      error instanceof InvalidMarketOrderError
    ) {
      redirect(`${investmentsPath}?market=invalid-order`);
    }

    redirect(`${investmentsPath}?market=order-error`);
  }

  revalidatePath(investmentsPath);
  redirect(`${investmentsPath}?market=order-saved`);
}

export async function deleteManualMarketOrder(
  formData: FormData,
): Promise<never> {
  await verifySession();

  const orderId = getFormString(formData, "orderId");

  if (!orderId) {
    redirect(`${investmentsPath}?market=invalid-order`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.manualMarketOrder.findUnique({
        where: { id: orderId },
        include: {
          asset: {
            include: {
              orders: {
                orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      });

      if (!existingOrder) {
        throw new InvalidMarketOrderError();
      }

      const remainingOrders = getStoredAssetOrders(existingOrder.asset).filter(
        (order) => order.id !== orderId,
      );

      await tx.manualMarketOrder.delete({
        where: { id: orderId },
      });

      if (remainingOrders.length === 0) {
        await tx.manualMarketAsset.delete({
          where: { id: existingOrder.assetId },
        });
        return;
      }

      const position = calculateCryptoPosition(remainingOrders);

      await tx.manualMarketAsset.update({
        where: { id: existingOrder.assetId },
        data: {
          quantity: position.quantity,
          averagePrice: position.averagePrice,
        },
      });
    });
  } catch (error) {
    if (error instanceof InvalidMarketOrderError) {
      redirect(`${investmentsPath}?market=invalid-order`);
    }

    redirect(`${investmentsPath}?market=order-error`);
  }

  revalidatePath(investmentsPath);
  redirect(`${investmentsPath}?market=order-deleted`);
}
