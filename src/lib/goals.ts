/** Progresso de uma meta de economia. Módulo puro. */

export type GoalEvaluation = {
  progress: number;
  remaining: number;
  done: boolean;
  /** Meses inteiros até a data-alvo (mínimo 1), quando há data. */
  monthsLeft: number | null;
  /** Quanto guardar por mês para chegar lá a tempo. */
  monthlyNeeded: number | null;
};

export function evaluateGoal({
  targetAmount,
  savedAmount,
  targetDate,
  now,
}: {
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  now: Date;
}): GoalEvaluation {
  const remaining = Math.max(0, targetAmount - savedAmount);
  const progress =
    targetAmount > 0 ? Math.min(1, Math.max(0, savedAmount / targetAmount)) : 0;
  const done = remaining === 0 && targetAmount > 0;

  let monthsLeft: number | null = null;
  if (targetDate && /^\d{4}-\d{2}(-\d{2})?$/.test(targetDate)) {
    const [year, month] = targetDate.split("-").map(Number);
    const diff =
      (year - now.getUTCFullYear()) * 12 + (month - (now.getUTCMonth() + 1));
    monthsLeft = Math.max(1, diff);
  }

  return {
    progress: Math.round(progress * 1000) / 1000,
    remaining: Math.round(remaining * 100) / 100,
    done,
    monthsLeft,
    monthlyNeeded:
      monthsLeft && !done
        ? Math.ceil((remaining / monthsLeft) * 100) / 100
        : null,
  };
}
