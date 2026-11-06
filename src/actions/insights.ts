"use server";

import { getBudgetsOverview } from "@/actions/budgets";
import { getCreditCards } from "@/actions/credit-cards";
import { listGoals } from "@/actions/goals";
import { getSpendingPace } from "@/actions/overview";
import { getSubscriptions } from "@/actions/subscriptions";
import { verifySession } from "@/lib/auth/dal";
import { buildInsights, type Insight } from "@/lib/insights";

/**
 * Os avisos do Tito para a visão geral. Cada fonte falha sozinha: um banco
 * fora do ar não pode esconder os outros avisos.
 */
export async function getInsights(now = new Date()): Promise<Insight[]> {
  await verifySession();

  const [budgets, subscriptions, cards, pace, goals] = await Promise.allSettled(
    [
      getBudgetsOverview(now),
      getSubscriptions(now),
      getCreditCards(),
      getSpendingPace(),
      listGoals(now),
    ],
  );
  const value = <T>(result: PromiseSettledResult<T>) =>
    result.status === "fulfilled" ? result.value : null;

  const paceResult = value(pace);
  const pacePoint = paceResult?.points.find(
    (point) => point.day === paceResult.currentMonth.elapsedDays,
  );

  return buildInsights({
    now,
    budgets: value(budgets)?.budgets ?? [],
    subscriptions: value(subscriptions)?.subscriptions ?? [],
    cards: value(cards)?.cards ?? [],
    pace:
      paceResult && pacePoint
        ? {
            elapsedDays: paceResult.currentMonth.elapsedDays,
            current: pacePoint.current,
            previous: pacePoint.previous,
            previousLabel: paceResult.previousMonth.label,
          }
        : null,
    goals: value(goals) ?? [],
  });
}
