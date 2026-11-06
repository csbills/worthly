import "server-only";

import { prisma } from "@/lib/prisma";
import {
  createTransactionAdjustments,
  emptyTransactionAdjustments,
  type TransactionAdjustments,
} from "@/lib/transaction-adjustments";

/**
 * Lê os ajustes e as regras do banco. Uma falha aqui não pode derrubar as
 * telas de dinheiro: sem ajustes, vale a categorização da Pluggy.
 */
export async function loadTransactionAdjustments(): Promise<TransactionAdjustments> {
  try {
    const [overrides, rules] = await Promise.all([
      prisma.transactionOverride.findMany({
        select: {
          transactionId: true,
          categoryId: true,
          note: true,
          ignored: true,
        },
      }),
      prisma.categoryRule.findMany({
        select: { id: true, pattern: true, categoryId: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return createTransactionAdjustments({ overrides, rules });
  } catch {
    return emptyTransactionAdjustments;
  }
}
