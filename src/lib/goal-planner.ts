/**
 * Organiza várias metas com data na sobra mensal da casa, de forma
 * determinística: os números do plano saem daqui, nunca do modelo de
 * linguagem. Módulo puro.
 *
 * Regras:
 * - A reserva de emergência continua recebendo metade da sobra até ficar
 *   pronta: meta nenhuma passa na frente da segurança da casa.
 * - O dinheiro vai primeiro para a meta de prazo mais próximo (e, no empate,
 *   a de maior prioridade). Isso é o que mais cumpre prazos com um caixa só.
 * - Se não couber, calcula quanto falta por mês, sugere economias só nos
 *   gastos de escolha e, se ainda faltar, novas datas para as metas menos
 *   prioritárias.
 */

export type PlannerGoal = {
  key: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  /** Mês em que a meta precisa estar completa (YYYY-MM). */
  targetMonth: string;
  /** 1 é a mais importante. */
  priority: number;
  /** Meta nova (proposta agora) ou que já existe no app. */
  isNew: boolean;
};

export type PlannerSavingsSource = {
  groupId: string;
  label: string;
  icon: string;
  monthlyTypical: number;
};

export type GoalOutcome = {
  key: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  remaining: number;
  targetMonth: string;
  priority: number;
  isNew: boolean;
  completionMonth: string | null;
  onTime: boolean;
  /** Cabia no prazo mesmo sem as economias sugeridas. */
  onTimeWithoutSavings: boolean;
};

export type GoalPhase = {
  from: string;
  to: string;
  allocations: { key: string; name: string; amount: number }[];
  /** O que sobra no mês depois das metas e da reserva. */
  leftover: number;
};

export type GoalSchedule = {
  monthlyCapacity: number;
  emergency: { monthly: number; untilMonth: string | null };
  /** Todas as metas cabem no prazo com a sobra de hoje. */
  feasible: boolean;
  /** Quanto a mais por mês faria todas caberem no prazo. */
  extraNeeded: number;
  savings: {
    groupId: string;
    label: string;
    icon: string;
    typical: number;
    cut: number;
  }[];
  savingsTotal: number;
  /** As economias sugeridas bastam para todas as datas. */
  coversShortfall: boolean;
  /** Novas datas propostas quando nem as economias bastam. */
  adjustedDates: { key: string; name: string; from: string; to: string }[];
  outcomes: GoalOutcome[];
  phases: GoalPhase[];
};

const EMERGENCY_SHARE = 0.5;
const MAX_CUT_SHARE = 0.2;
const HORIZON = 120;

const roundUp = (value: number, step = 10) => Math.ceil(value / step) * step;
const cents = (value: number) => Math.round(value * 100) / 100;

export function monthIndex(key: string) {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + (month - 1);
}

export function monthKey(index: number) {
  return `${Math.floor(index / 12)}-${((index % 12) + 1).toString().padStart(2, "0")}`;
}

function currentMonthIndex(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "numeric",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return Number(parts.year) * 12 + Number(parts.month) - 1;
}

type Simulation = {
  completion: Map<string, number>;
  months: {
    index: number;
    allocations: Map<string, number>;
    leftover: number;
  }[];
  emergencyUntil: number | null;
  emergencyMonthly: number;
};

function simulate(
  goals: readonly PlannerGoal[],
  capacity: number,
  emergencyGap: number,
  extra: number,
  start: number,
  until: number,
): Simulation {
  const remaining = new Map(
    goals.map((goal) => [
      goal.key,
      Math.max(0, goal.targetAmount - goal.savedAmount),
    ]),
  );
  const completion = new Map<string, number>();
  for (const [key, value] of remaining)
    if (value === 0) completion.set(key, start - 1);

  const order = [...goals].sort(
    (a, b) =>
      monthIndex(a.targetMonth) - monthIndex(b.targetMonth) ||
      a.priority - b.priority,
  );
  const months: Simulation["months"] = [];
  let emergencyLeft = emergencyGap;
  let emergencyUntil: number | null = emergencyGap > 0 ? null : start - 1;
  const emergencyMonthly =
    emergencyGap > 0 ? cents(capacity * EMERGENCY_SHARE) : 0;

  for (let index = start; index <= until; index += 1) {
    let available = capacity;
    if (emergencyLeft > 0) {
      const toEmergency = Math.min(emergencyLeft, capacity * EMERGENCY_SHARE);
      emergencyLeft -= toEmergency;
      available -= toEmergency;
      if (emergencyLeft <= 0) emergencyUntil = index;
    }
    available += extra;

    const allocations = new Map<string, number>();
    for (const goal of order) {
      const left = remaining.get(goal.key) ?? 0;
      if (left <= 0 || available <= 0) continue;
      const amount = Math.min(left, available);
      available -= amount;
      remaining.set(goal.key, left - amount);
      allocations.set(goal.key, cents(amount));
      if (left - amount <= 0.005) completion.set(goal.key, index);
    }

    months.push({
      index,
      allocations,
      leftover: cents(Math.max(0, available)),
    });
    if (completion.size === goals.length && emergencyLeft <= 0) break;
  }

  return { completion, months, emergencyUntil, emergencyMonthly };
}

/** Quanto a mais por mês faz todos os prazos caberem (folga mínima por prazo). */
function extraForDeadlines(
  goals: readonly PlannerGoal[],
  base: Simulation,
  capacity: number,
  start: number,
) {
  const availableByMonth = base.months.map((month) => {
    const emergency =
      base.emergencyUntil !== null && month.index <= base.emergencyUntil
        ? Math.min(capacity, base.emergencyMonthly)
        : 0;
    return capacity - emergency;
  });
  const deadlines = [
    ...new Set(goals.map((goal) => monthIndex(goal.targetMonth))),
  ].sort((a, b) => a - b);
  let extra = 0;

  for (const deadline of deadlines) {
    const months = Math.max(1, deadline - start + 1);
    const need = goals
      .filter((goal) => monthIndex(goal.targetMonth) <= deadline)
      .reduce(
        (sum, goal) => sum + Math.max(0, goal.targetAmount - goal.savedAmount),
        0,
      );
    const available = availableByMonth
      .slice(0, months)
      .reduce((sum, value) => sum + value, 0);
    extra = Math.max(extra, (need - available) / months);
  }

  return extra > 0 ? roundUp(extra) : 0;
}

function toPhases(
  goals: readonly PlannerGoal[],
  simulation: Simulation,
  lastIndex: number,
) {
  const names = new Map(goals.map((goal) => [goal.key, goal.name]));
  const phases: GoalPhase[] = [];

  for (const month of simulation.months) {
    if (month.index > lastIndex) break;
    const allocations = [...month.allocations.entries()].map(
      ([key, amount]) => ({
        key,
        name: names.get(key) ?? key,
        amount,
      }),
    );
    const signature = allocations
      .map((item) => `${item.key}:${item.amount}`)
      .join("|");
    const previous = phases.at(-1);
    const previousSignature = previous?.allocations
      .map((item) => `${item.key}:${item.amount}`)
      .join("|");

    if (
      previous &&
      previousSignature === signature &&
      previous.leftover === month.leftover
    ) {
      previous.to = monthKey(month.index);
    } else {
      phases.push({
        from: monthKey(month.index),
        to: monthKey(month.index),
        allocations,
        leftover: month.leftover,
      });
    }
  }

  return phases.filter((phase) => phase.allocations.length > 0);
}

export function planGoals({
  goals,
  monthlyCapacity,
  emergencyGap,
  savingsSources,
  now,
}: {
  goals: readonly PlannerGoal[];
  monthlyCapacity: number;
  emergencyGap: number;
  savingsSources: readonly PlannerSavingsSource[];
  now: Date;
}): GoalSchedule {
  const capacity = Math.max(0, monthlyCapacity);
  // As metas recebem a partir do mês que vem: o deste já está em andamento.
  const start = currentMonthIndex(now) + 1;
  const until = start + HORIZON;
  const lastDeadline = Math.max(
    start,
    ...goals.map((goal) => monthIndex(goal.targetMonth)),
  );

  const base = simulate(goals, capacity, emergencyGap, 0, start, until);
  const isOnTime = (simulation: Simulation, goal: PlannerGoal) => {
    const done = simulation.completion.get(goal.key);
    return done !== undefined && done <= monthIndex(goal.targetMonth);
  };
  const feasible = goals.every((goal) => isOnTime(base, goal));
  const extraNeeded = feasible
    ? 0
    : extraForDeadlines(goals, base, capacity, start);

  // Economias: até 20% dos maiores gastos de escolha, até cobrir o que falta.
  const savings: GoalSchedule["savings"] = [];
  let savingsTotal = 0;
  if (extraNeeded > 0) {
    for (const source of [...savingsSources].sort(
      (a, b) => b.monthlyTypical - a.monthlyTypical,
    )) {
      if (savingsTotal >= extraNeeded) break;
      const cut = Math.min(
        roundUp(source.monthlyTypical * MAX_CUT_SHARE),
        roundUp(extraNeeded - savingsTotal),
      );
      if (cut <= 0) continue;
      savings.push({
        groupId: source.groupId,
        label: source.label,
        icon: source.icon,
        typical: cents(source.monthlyTypical),
        cut,
      });
      savingsTotal += cut;
    }
  }

  const final =
    savingsTotal > 0
      ? simulate(goals, capacity, emergencyGap, savingsTotal, start, until)
      : base;
  const coversShortfall = goals.every((goal) => isOnTime(final, goal));

  const adjustedDates = goals
    .filter((goal) => !isOnTime(final, goal))
    .map((goal) => {
      const done = final.completion.get(goal.key);
      return {
        key: goal.key,
        name: goal.name,
        from: goal.targetMonth,
        to: done === undefined ? monthKey(until) : monthKey(done),
      };
    });

  const outcomes: GoalOutcome[] = goals.map((goal) => {
    const done = final.completion.get(goal.key);
    return {
      key: goal.key,
      name: goal.name,
      emoji: goal.emoji,
      targetAmount: cents(goal.targetAmount),
      savedAmount: cents(goal.savedAmount),
      remaining: cents(Math.max(0, goal.targetAmount - goal.savedAmount)),
      targetMonth: goal.targetMonth,
      priority: goal.priority,
      isNew: goal.isNew,
      completionMonth:
        done === undefined ? null : monthKey(Math.max(done, start - 1)),
      onTime: isOnTime(final, goal),
      onTimeWithoutSavings: isOnTime(base, goal),
    };
  });

  const lastCompletion = Math.max(
    lastDeadline,
    ...[...final.completion.values()],
  );

  return {
    monthlyCapacity: cents(capacity),
    emergency: {
      monthly: final.emergencyMonthly,
      untilMonth:
        emergencyGap > 0 && final.emergencyUntil !== null
          ? monthKey(final.emergencyUntil)
          : null,
    },
    feasible,
    extraNeeded,
    savings,
    savingsTotal,
    coversShortfall,
    adjustedDates,
    outcomes,
    phases: toPhases(goals, final, lastCompletion),
  };
}
