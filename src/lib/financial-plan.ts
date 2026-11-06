/**
 * O plano da casa: de onde sai o dinheiro para cada objetivo, em que ordem e
 * em quanto tempo, a partir do que a família realmente vive hoje. Módulo
 * puro e determinístico — as mesmas entradas dão sempre o mesmo plano.
 *
 * Princípios:
 * - Compara a casa com ela mesma, nunca com uma média de outras famílias.
 * - Ordem: equilibrar o mês, sair dos juros caros, reserva, depois investir.
 * - Compromissos com data para acabar (financiamento, escola) devolvem
 *   dinheiro ao plano no mês em que terminam.
 * - Tudo em reais de hoje, com retorno acima da inflação. É estimativa, não
 *   promessa nem recomendação de investimento.
 */

import type { FinancialBaseline } from "@/lib/financial-baseline";

export type PlanProfile = {
  householdType: "single" | "couple" | "family";
  dependents: number;
  incomeStability: "stable" | "variable";
  incomeEarners: number;
  birthYear: number | null;
  targetIndependenceAge: number | null;
  desiredMonthlyCost: number | null;
  expectedRealReturn: number;
  withdrawalRate: number;
  emergencyMonths: number | null;
};

export type PlanObligation = {
  id: string;
  name: string;
  kind: string;
  monthlyAmount: number;
  endMonth: string | null;
  balance: number | null;
  interestRate: number | null;
};

export type PlanScenarioKey = "current" | "freed" | "cuts";

export type PlanScenario = {
  key: PlanScenarioKey;
  label: string;
  /** Aporte mensal para a independência depois da reserva pronta. */
  monthlyContribution: number;
  monthsToGoal: number | null;
  reachMonth: string | null;
  reachAge: number | null;
  /** Patrimônio investido no fim de cada ano, em reais de hoje. */
  points: { year: number; value: number }[];
};

export type PlanStep = {
  key: string;
  title: string;
  detail: string;
  tone: "warning" | "info" | "success";
};

export type GoalSuggestion = {
  key: "emergency" | "independence";
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
};

export type FinancialPlan = {
  capacity: number;
  emergency: {
    months: number;
    essentialMonthly: number;
    target: number;
    current: number;
    gap: number;
    monthlyContribution: number;
    monthsToComplete: number | null;
    done: boolean;
  };
  obligations: {
    totalMonthly: number;
    /** Quando cada compromisso acaba e quanto devolve por mês. */
    freed: { month: string; name: string; amount: number }[];
    hints: { id: string; name: string; text: string }[];
  };
  independence: {
    monthlyCost: number;
    target: number;
    invested: number;
    progress: number;
    scenarios: PlanScenario[];
    targetAge: number | null;
    requiredMonthly: number | null;
    status: "on-track" | "tight" | "far" | "unknown";
  };
  cuts: {
    groupId: string;
    label: string;
    icon: string;
    typical: number;
    suggested: number;
  }[];
  steps: PlanStep[];
  goalSuggestions: GoalSuggestion[];
  warnings: string[];
};

const MAX_MONTHS = 50 * 12;
const ASSUMED_INFLATION = 4;
const EMERGENCY_SHARE = 0.7;
const CUT_SHARE = 0.15;
/** Transferências e investimentos não são gasto de escolha para cortar. */
const notCuttable = new Set(["03000000", "04000000", "05000000"]);

const round = (value: number) => Math.round(value * 100) / 100;
const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function monthIndex(key: string) {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + (month - 1);
}

function monthKey(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${month.toString().padStart(2, "0")}`;
}

function formatMonth(key: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(new Date(`${key}-15T12:00:00Z`));
}

function formatDuration(months: number) {
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsText = `${years} ${years === 1 ? "ano" : "anos"}`;
  return rest
    ? `${yearsText} e ${rest} ${rest === 1 ? "mês" : "meses"}`
    : yearsText;
}

/** Meses de reserva sugeridos para o perfil da casa. */
export function recommendedEmergencyMonths(profile: PlanProfile) {
  let months = profile.incomeStability === "variable" ? 6 : 3;
  // Uma renda sustentando mais de uma pessoa: mais fôlego.
  if (profile.householdType !== "single" && profile.incomeEarners <= 1)
    months += 2;
  if (profile.dependents > 0) months += 1;
  return Math.min(12, months);
}

export function buildFinancialPlan({
  baseline,
  profile,
  obligations,
  balances,
  existingGoalNames,
  now,
}: {
  baseline: FinancialBaseline;
  profile: PlanProfile;
  obligations: readonly PlanObligation[];
  balances: { liquid: number; invested: number };
  existingGoalNames: readonly string[];
  now: Date;
}): FinancialPlan {
  const warnings: string[] = [];
  const capacity = Math.max(0, baseline.savingsCapacity);
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const currentAge = profile.birthYear
    ? now.getUTCFullYear() - profile.birthYear
    : null;
  const monthlyRate = (1 + profile.expectedRealReturn / 100) ** (1 / 12) - 1;

  if (baseline.confidence === "low") {
    warnings.push(
      "Ainda há pouco histórico (menos de 3 meses fechados). Os números vão ficar mais precisos com o tempo.",
    );
  }

  // Reserva de emergência: meses de gastos essenciais, não do gasto total.
  const months = profile.emergencyMonths ?? recommendedEmergencyMonths(profile);
  const essentialMonthly =
    baseline.typicalEssential > 0
      ? baseline.typicalEssential
      : round(baseline.typicalExpenses * 0.7);
  const emergencyTarget = roundUp(essentialMonthly * months, 100);
  const emergencyCurrent = Math.max(0, round(balances.liquid));
  const emergencyGap = Math.max(0, round(emergencyTarget - emergencyCurrent));
  const emergencyContribution =
    emergencyGap > 0 ? roundUp(capacity * EMERGENCY_SHARE, 10) : 0;
  const monthsToComplete =
    emergencyGap === 0
      ? 0
      : emergencyContribution > 0
        ? Math.ceil(emergencyGap / emergencyContribution)
        : null;

  // Compromissos: quanto pesam e quando devolvem dinheiro.
  const totalObligations = round(
    obligations.reduce((sum, item) => sum + item.monthlyAmount, 0),
  );
  const freed = obligations
    .filter((item) => item.endMonth && monthIndex(item.endMonth) >= nowIndex)
    .map((item) => ({
      month: monthKey(monthIndex(item.endMonth as string) + 1),
      name: item.name,
      amount: item.monthlyAmount,
    }))
    .sort((a, b) => monthIndex(a.month) - monthIndex(b.month));
  const hints = obligations.flatMap((item) => {
    if (item.interestRate === null || !item.balance) return [];
    const threshold = profile.expectedRealReturn + ASSUMED_INFLATION + 2;
    return [
      {
        id: item.id,
        name: item.name,
        text:
          item.interestRate > threshold
            ? `Juros de ${item.interestRate}% ao ano passam do que um investimento conservador costuma render. Amortizar (de preferência reduzindo o prazo) tende a valer mais que investir a mesma sobra.`
            : `Juros de ${item.interestRate}% ao ano estão perto do que investimentos conservadores rendem. Manter a parcela e investir a sobra costuma ser equivalente — e deixa o dinheiro disponível.`,
      },
    ];
  });

  // Custo de vida na independência: o atual sem o que já vai ter acabado.
  const endingMonthly = obligations
    .filter((item) => item.endMonth)
    .reduce((sum, item) => sum + item.monthlyAmount, 0);
  const monthlyCost = round(
    profile.desiredMonthlyCost ??
      Math.max(baseline.typicalExpenses - endingMonthly, essentialMonthly),
  );
  const independenceTarget = roundUp(
    (monthlyCost * 12) / (profile.withdrawalRate / 100),
    1000,
  );
  const invested = Math.max(0, round(balances.invested));

  // Ajustes realistas: só nos gastos de escolha, 15% dos três maiores.
  const cuts = baseline.groups
    .filter(
      (group) =>
        !group.essential &&
        !notCuttable.has(group.groupId) &&
        group.monthlyTypical >= 100,
    )
    .slice(0, 3)
    .map((group) => ({
      groupId: group.groupId,
      label: group.label,
      icon: group.icon,
      typical: group.monthlyTypical,
      suggested: roundUp(group.monthlyTypical * CUT_SHARE, 10),
    }));
  const cutsTotal = cuts.reduce((sum, cut) => sum + cut.suggested, 0);

  const simulate = (
    key: PlanScenarioKey,
    label: string,
    reinvestFreed: boolean,
    extra: number,
  ): PlanScenario => {
    let value = invested;
    let emergencyLeft = emergencyGap;
    let reached: number | null = value >= independenceTarget ? 0 : null;
    const points: PlanScenario["points"] = [];

    for (let step = 1; step <= MAX_MONTHS && reached === null; step += 1) {
      const index = nowIndex + step;
      const freedNow = reinvestFreed
        ? freed
            .filter((item) => monthIndex(item.month) <= index)
            .reduce((sum, item) => sum + item.amount, 0)
        : 0;
      let available = capacity + extra + freedNow;

      if (emergencyLeft > 0) {
        const toEmergency = Math.min(
          emergencyLeft,
          available * EMERGENCY_SHARE,
        );
        emergencyLeft -= toEmergency;
        available -= toEmergency;
      }

      value = value * (1 + monthlyRate) + available;
      if (step % 12 === 0) {
        points.push({ year: Math.floor(index / 12), value: Math.round(value) });
      }
      if (value >= independenceTarget) reached = step;
    }

    return {
      key,
      label,
      monthlyContribution: round(capacity + extra),
      monthsToGoal: reached,
      reachMonth: reached === null ? null : monthKey(nowIndex + reached),
      reachAge:
        reached === null || currentAge === null
          ? null
          : currentAge + Math.floor(reached / 12),
      points,
    };
  };

  const scenarios: PlanScenario[] = [
    simulate("current", "No ritmo de hoje", false, 0),
  ];
  if (freed.length > 0) {
    scenarios.push(
      simulate(
        "freed",
        "Reinvestindo o que os compromissos liberarem",
        true,
        0,
      ),
    );
  }
  if (cutsTotal > 0) {
    scenarios.push(
      simulate(
        "cuts",
        `Com os ajustes sugeridos (+${formatCurrency(cutsTotal)}/mês)`,
        true,
        cutsTotal,
      ),
    );
  }

  // Quanto precisaria investir por mês para chegar na idade escolhida.
  let requiredMonthly: number | null = null;
  let status: FinancialPlan["independence"]["status"] = "unknown";
  if (profile.targetIndependenceAge && currentAge !== null) {
    const horizon = (profile.targetIndependenceAge - currentAge) * 12;
    if (horizon > 0) {
      const growth = (1 + monthlyRate) ** horizon;
      const needed = independenceTarget - invested * growth;
      requiredMonthly =
        needed <= 0
          ? 0
          : roundUp(
              monthlyRate > 0
                ? (needed * monthlyRate) / (growth - 1)
                : needed / horizon,
              10,
            );
      status =
        requiredMonthly <= capacity
          ? "on-track"
          : requiredMonthly <= (capacity + cutsTotal) * 1.3
            ? "tight"
            : "far";
    } else {
      status = "far";
    }
  }

  // Passos, na ordem em que fazem sentido.
  const steps: PlanStep[] = [];
  if (baseline.savingsCapacity <= 0 && baseline.monthsAnalyzed > 0) {
    steps.push({
      key: "balance",
      tone: "warning",
      title: "Primeiro, fechar o mês no azul",
      detail: `Num mês típico saem ${formatCurrency(-baseline.savingsCapacity)} a mais do que entra. Antes de guardar, o foco é ajustar os gastos de escolha${cuts.length ? ` — ${cuts.map((cut) => cut.label).join(", ")}` : ""}.`,
    });
  }
  if (baseline.debt.hasExpensiveDebt) {
    steps.push({
      key: "debt",
      tone: "warning",
      title: "Sair dos juros caros",
      detail: `Foram ${formatCurrency(baseline.debt.interestAndFees)} em juros, multas ou cheque especial nos últimos meses. Esse dinheiro rende contra você mais do que qualquer investimento rende a favor: quite antes de investir.`,
    });
  }
  if (emergencyGap > 0) {
    steps.push({
      key: "emergency",
      tone: "info",
      title: `Montar a reserva de emergência: ${formatCurrency(emergencyTarget)}`,
      detail: `${months} meses dos gastos essenciais da casa (${formatCurrency(essentialMonthly)}/mês). Você já tem ${formatCurrency(emergencyCurrent)} em conta.${monthsToComplete ? ` Guardando ${formatCurrency(emergencyContribution)} por mês, fica pronta em ${formatDuration(monthsToComplete)}.` : ""}`,
    });
  } else {
    steps.push({
      key: "emergency-done",
      tone: "success",
      title: "Reserva de emergência em dia",
      detail: `Os ${formatCurrency(emergencyCurrent)} em conta cobrem ${months} meses de gastos essenciais.`,
    });
  }
  for (const item of freed) {
    steps.push({
      key: `freed-${item.name}`,
      tone: "info",
      title: `Em ${formatMonth(item.month)}, ${item.name} acaba`,
      detail: `São ${formatCurrency(item.amount)} por mês que voltam para o plano. Redirecione para os investimentos assim que a última parcela sair, antes que o dinheiro se dilua no dia a dia.`,
    });
  }
  if (capacity > 0) {
    const best = scenarios.at(-1);
    steps.push({
      key: "invest",
      tone: "info",
      title: `Investir para a independência: ${formatCurrency(independenceTarget)}`,
      detail: `É o patrimônio que paga ${formatCurrency(monthlyCost)} por mês retirando ${profile.withdrawalRate}% ao ano.${best?.monthsToGoal ? ` No melhor cenário, você chega lá em ${formatDuration(best.monthsToGoal)}${best.reachAge ? `, aos ${best.reachAge} anos` : ""}.` : ""}`,
    });
  }
  if (cuts.length > 0 && capacity > 0) {
    steps.push({
      key: "cuts",
      tone: "info",
      title: `Ajustes que somam ${formatCurrency(cutsTotal)} por mês`,
      detail: `${cuts.map((cut) => `${cut.label}: −${formatCurrency(cut.suggested)}`).join(" · ")}. São ~15% do seu típico nessas categorias: dá para sentir pouco no dia a dia.`,
    });
  }

  const hasGoal = (pattern: RegExp) =>
    existingGoalNames.some((name) => pattern.test(name));
  const goalSuggestions: GoalSuggestion[] = [];
  if (emergencyGap > 0 && !hasGoal(/reserva|emerg/i)) {
    goalSuggestions.push({
      key: "emergency",
      name: "Reserva de emergência",
      emoji: "🛟",
      targetAmount: emergencyTarget,
      savedAmount: emergencyCurrent,
      targetDate: monthsToComplete
        ? monthKey(nowIndex + monthsToComplete)
        : null,
    });
  }
  const bestReach = scenarios.at(-1)?.reachMonth ?? null;
  if (!hasGoal(/independ|liberdade/i)) {
    goalSuggestions.push({
      key: "independence",
      name: "Independência financeira",
      emoji: "🌴",
      targetAmount: independenceTarget,
      savedAmount: invested,
      targetDate: bestReach,
    });
  }

  return {
    capacity,
    emergency: {
      months,
      essentialMonthly: round(essentialMonthly),
      target: emergencyTarget,
      current: emergencyCurrent,
      gap: emergencyGap,
      monthlyContribution: emergencyContribution,
      monthsToComplete,
      done: emergencyGap === 0,
    },
    obligations: { totalMonthly: totalObligations, freed, hints },
    independence: {
      monthlyCost,
      target: independenceTarget,
      invested,
      progress:
        independenceTarget > 0
          ? Math.min(
              1,
              Math.round((invested / independenceTarget) * 1000) / 1000,
            )
          : 0,
      scenarios,
      targetAge: profile.targetIndependenceAge,
      requiredMonthly,
      status,
    },
    cuts,
    steps,
    goalSuggestions,
    warnings,
  };
}
