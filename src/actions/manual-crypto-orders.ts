"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { findSupportedCryptoAsset } from "@/lib/crypto-assets";
import {
  type CryptoOrder,
  calculateCryptoOrderQuantity,
  calculateCryptoPosition,
  InsufficientCryptoQuantityError,
} from "@/lib/crypto-orders";
import { prisma } from "@/lib/prisma";

const investmentsPath = "/investments";

class InvalidCryptoOrderError extends Error {
  constructor() {
    super("A ordem de criptoativo é inválida.");
    this.name = "InvalidCryptoOrderError";
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

function toCryptoOrder(order: {
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
  purchaseTotal: number | null;
  brokerFee: number;
  purchasePrice: number | null;
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
  if (asset.orders && asset.orders.length > 0) {
    return asset.orders.map(toCryptoOrder);
  }

  if (
    asset.purchaseTotal !== null &&
    asset.purchasePrice !== null &&
    asset.purchaseTotal > asset.brokerFee &&
    asset.purchasePrice > 0
  ) {
    return [
      {
        id: `legacy:${asset.id}`,
        side: "BUY",
        orderDate: asset.createdAt.toISOString().slice(0, 10),
        total: asset.purchaseTotal,
        brokerFee: asset.brokerFee,
        unitPrice: asset.purchasePrice,
        createdAt: asset.createdAt.toISOString(),
      },
    ];
  }

  if (
    asset.quantity > 0 &&
    asset.averagePrice !== null &&
    asset.averagePrice > 0
  ) {
    return [
      {
        id: `legacy:${asset.id}`,
        side: "BUY",
        orderDate: asset.createdAt.toISOString().slice(0, 10),
        total: asset.quantity * asset.averagePrice,
        brokerFee: 0,
        unitPrice: asset.averagePrice,
        createdAt: asset.createdAt.toISOString(),
      },
    ];
  }

  return [];
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

export async function saveManualCryptoOrder(
  formData: FormData,
): Promise<never> {
  const orderId = getFormString(formData, "orderId") || null;
  const assetId = getFormString(formData, "assetId");
  const asset = findSupportedCryptoAsset(assetId);
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
    redirect(`${investmentsPath}?crypto=invalid-order`);
  }

  const quantity = calculateCryptoOrderQuantity(total, brokerFee, unitPrice);
  const now = new Date().toISOString();

  try {
    await prisma.$transaction(async (tx) => {
      let targetAsset: {
        id: string;
        symbol: string;
        name: string;
        currentPrice: number | null;
        createdAt: Date;
        quantity: number;
        averagePrice: number | null;
        purchaseTotal: number | null;
        brokerFee: number;
        purchasePrice: number | null;
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
        const existingOrder = await tx.manualCryptoOrder.findUnique({
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
          throw new InvalidCryptoOrderError();
        }

        targetAsset = existingOrder.asset;
        currentOrder = existingOrder;
        orders = getStoredAssetOrders(targetAsset).filter(
          (order) => order.id !== orderId,
        );
      } else {
        const existingAsset = await tx.manualCryptoAsset.findUnique({
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
          (await tx.manualCryptoAsset.create({
            data: {
              symbol: asset.symbol,
              name: asset.name,
              quantity: 0,
              averagePrice: null,
              currentPrice: null,
              currencyCode: "BRL",
              coingeckoId: asset.coingeckoId,
              purchaseTotal: null,
              brokerFee: 0,
              purchasePrice: null,
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
        await tx.manualCryptoOrder.update({
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
        await tx.manualCryptoOrder.create({
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

      await tx.manualCryptoAsset.update({
        where: { id: targetAsset.id },
        data: {
          name: asset.name,
          quantity: position.quantity,
          averagePrice: position.averagePrice,
          coingeckoId: asset.coingeckoId,
          purchaseTotal:
            position.amountOriginal > 0 ? position.amountOriginal : null,
          brokerFee: 0,
          purchasePrice: position.averagePrice,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof InsufficientCryptoQuantityError ||
      error instanceof InvalidCryptoOrderError
    ) {
      redirect(`${investmentsPath}?crypto=invalid-order`);
    }

    redirect(`${investmentsPath}?crypto=order-error`);
  }

  revalidatePath(investmentsPath);
  redirect(`${investmentsPath}?crypto=order-saved`);
}

export async function deleteManualCryptoOrder(
  formData: FormData,
): Promise<never> {
  const orderId = getFormString(formData, "orderId");

  if (!orderId) {
    redirect(`${investmentsPath}?crypto=invalid-order`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.manualCryptoOrder.findUnique({
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
        throw new InvalidCryptoOrderError();
      }

      const remainingOrders = getStoredAssetOrders(existingOrder.asset).filter(
        (order) => order.id !== orderId,
      );

      await tx.manualCryptoOrder.delete({
        where: { id: orderId },
      });

      if (remainingOrders.length === 0) {
        await tx.manualCryptoAsset.delete({
          where: { id: existingOrder.assetId },
        });
        return;
      }

      const position = calculateCryptoPosition(remainingOrders);

      await tx.manualCryptoAsset.update({
        where: { id: existingOrder.assetId },
        data: {
          quantity: position.quantity,
          averagePrice: position.averagePrice,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof InsufficientCryptoQuantityError ||
      error instanceof InvalidCryptoOrderError
    ) {
      redirect(`${investmentsPath}?crypto=invalid-order`);
    }

    redirect(`${investmentsPath}?crypto=order-error`);
  }

  revalidatePath(investmentsPath);
  redirect(`${investmentsPath}?crypto=order-deleted`);
}
