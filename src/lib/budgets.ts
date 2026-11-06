/**
 * Orçamentos mensais por grupo de categoria. Módulo puro: recebe o gasto do
 * mês e o dia atual, devolve situação e projeção.
 */

export type BudgetStatus = "ok" | "warning" | "over";

export type BudgetEvaluation = {
  spent: number;
  amount: number;
  /** Fração usada (0,5 = 50%). */
  used: number;
  remaining: number;
  /** Quanto o mês fecha se o ritmo atual continuar. */
  projected: number;
  status: BudgetStatus;
};

const WARNING_THRESHOLD = 0.8;

export function evaluateBudget({
  amount,
  spent,
  dayOfMonth,
  daysInMonth,
}: {
  amount: number;
  spent: number;
  dayOfMonth: number;
  daysInMonth: number;
}): BudgetEvaluation {
  const used = amount > 0 ? spent / amount : 0;
  const elapsed = Math.min(Math.max(dayOfMonth, 1), daysInMonth);
  const projected = (spent / elapsed) * daysInMonth;
  // Nos primeiros dias a projeção exagera qualquer compra; só vale a partir da 1ª semana.
  const projectedOver = elapsed >= 7 && projected > amount;
  const status: BudgetStatus =
    spent > amount
      ? "over"
      : used >= WARNING_THRESHOLD || projectedOver
        ? "warning"
        : "ok";

  return {
    spent: round(spent),
    amount: round(amount),
    used: Math.round(used * 1000) / 1000,
    remaining: round(amount - spent),
    projected: round(projected),
    status,
  };
}

/**
 * Sugestão de limite: média dos meses com gasto, arredondada para cima em
 * dezenas (ou centenas, acima de R$ 1.000), para sobrar uma folguinha.
 */
export function suggestBudgetAmount(monthlySpending: readonly number[]) {
  const months = monthlySpending.filter((value) => value > 0);
  if (months.length === 0) return null;

  const average = months.reduce((sum, value) => sum + value, 0) / months.length;
  const step = average >= 1000 ? 100 : 10;

  return Math.ceil(average / step) * step;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
