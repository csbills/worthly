"use server";

import { getTransactions } from "@/actions/transactions";
import { verifySession } from "@/lib/auth/dal";
import {
  type DetectedSubscription,
  detectSubscriptions,
} from "@/lib/subscriptions";
import { defaultTransactionFilters } from "@/lib/transaction-filters";

export type SubscriptionsResult = {
  subscriptions: DetectedSubscription[];
  /** Soma do custo mensal equivalente, em BRL. */
  monthlyTotal: number;
  yearlyTotal: number;
  error: string | null;
};

/** Assinaturas e cobranças recorrentes do último ano. */
export async function getSubscriptions(
  now = new Date(),
): Promise<SubscriptionsResult> {
  await verifySession();

  // Treze meses: o bastante para pegar anuidades cobradas uma vez por ano.
  const dayMs = 86_400_000;
  const result = await getTransactions({
    ...defaultTransactionFilters,
    period: "custom",
    dateFrom: new Date(now.getTime() - 400 * dayMs).toISOString().slice(0, 10),
    dateTo: new Date(now.getTime() + dayMs).toISOString().slice(0, 10),
    showHidden: true,
  });
  const subscriptions = detectSubscriptions(result.transactions, now).filter(
    (subscription) => subscription.currencyCode === "BRL",
  );
  const monthlyTotal = subscriptions.reduce(
    (sum, subscription) => sum + subscription.monthlyCost,
    0,
  );

  return {
    subscriptions,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    yearlyTotal: Math.round(monthlyTotal * 12 * 100) / 100,
    error: result.error,
  };
}
