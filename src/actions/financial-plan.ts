"use server";

import { listGoals } from "@/actions/goals";
import {
  getFinancialProfile,
  getHousehold,
  type HouseholdMemberView,
  listObligations,
} from "@/actions/household";
import { getInvestments } from "@/actions/investments";
import { getConnectedAccounts } from "@/actions/pluggy";
import { getSubscriptions } from "@/actions/subscriptions";
import { getTransactions } from "@/actions/transactions";
import { verifySession } from "@/lib/auth/dal";
import {
  type BaselineMember,
  buildFinancialBaseline,
  completedMonthKeys,
  type FinancialBaseline,
} from "@/lib/financial-baseline";
import {
  buildFinancialPlan,
  type FinancialPlan,
  type PlanObligation,
} from "@/lib/financial-plan";
import type { FinancialProfileView } from "@/lib/financial-profile";
import { defaultTransactionFilters } from "@/lib/transaction-filters";

const MONTHS = 6;

/** Categorias de cobranças recorrentes que costumam ser compromissos. */
const obligationKindByCategory: Record<string, string> = {
  Aluguel: "rent",
  Financiamento: "financing",
  "Financiamento imobiliário": "financing",
  "Financiamento de veículos": "financing",
  "Empréstimo estudantil": "loan",
  Empréstimos: "loan",
  Educação: "education",
};

export type ObligationCandidate = {
  name: string;
  kind: string;
  monthlyAmount: number;
};

export type FinancialPlanResult = {
  profile: FinancialProfileView;
  members: HouseholdMemberView[];
  obligations: PlanObligation[];
  candidates: ObligationCandidate[];
  baseline: FinancialBaseline;
  plan: FinancialPlan;
  balances: { liquid: number; invested: number };
  /** Há conexão sem dono definido e mais de uma pessoa na casa. */
  ownershipIncomplete: boolean;
  error: string | null;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

/**
 * O plano da casa a partir dos dados reais: seis meses fechados de
 * transações de todas as pessoas, saldos, investimentos, metas e compromissos.
 */
export async function getFinancialPlan(
  now = new Date(),
): Promise<FinancialPlanResult> {
  await verifySession();

  const [first] = completedMonthKeys(now, MONTHS);
  // "2026-11": o mês corrente fica de fora, ainda não fechou.
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(now);

  const [
    transactions,
    accounts,
    household,
    profile,
    obligations,
    goals,
    investments,
    subscriptions,
  ] = await Promise.all([
    getTransactions({
      ...defaultTransactionFilters,
      period: "custom",
      dateFrom: `${first}-01`,
      dateTo: `${currentMonth}-01`,
      showHidden: true,
    }),
    getConnectedAccounts(),
    getHousehold(),
    getFinancialProfile(),
    listObligations(),
    listGoals(now),
    getInvestments().catch(() => null),
    getSubscriptions(now).catch(() => null),
  ]);

  const membersById = new Map(
    household.members.map((member) => [member.id, member]),
  );
  const ownerByItem = new Map<string, BaselineMember>();
  for (const connection of household.connections) {
    const member = connection.memberId
      ? membersById.get(connection.memberId)
      : undefined;
    if (member) ownerByItem.set(connection.itemId, member);
  }
  const accountOwners = new Map<string, BaselineMember>();
  for (const account of accounts.accounts) {
    const owner = ownerByItem.get(account.itemId);
    if (owner) accountOwners.set(account.id, owner);
  }

  const baseline = buildFinancialBaseline({
    transactions: transactions.transactions,
    accountOwners,
    now,
    monthCount: MONTHS,
  });

  const liquid = accounts.accounts
    .filter((account) => account.type === "BANK" && account.balance > 0)
    .reduce((sum, account) => sum + account.balance, 0);
  const invested =
    investments?.currencies.find((currency) => currency.currencyCode === "BRL")
      ?.balance ?? 0;
  const balances = {
    liquid: Math.round(liquid * 100) / 100,
    invested: Math.round(invested * 100) / 100,
  };

  const plan = buildFinancialPlan({
    baseline,
    profile,
    obligations,
    balances,
    existingGoalNames: goals.map((goal) => goal.name),
    now,
  });

  // Recorrentes que parecem compromissos e ainda não foram cadastrados.
  const known = obligations.map((item) => normalize(item.name));
  const candidates: ObligationCandidate[] = (subscriptions?.subscriptions ?? [])
    .filter((subscription) => obligationKindByCategory[subscription.category])
    .filter(
      (subscription) =>
        !known.some(
          (name) =>
            name.includes(subscription.key) ||
            normalize(subscription.name).includes(name),
        ),
    )
    .map((subscription) => ({
      name: subscription.name,
      kind: obligationKindByCategory[subscription.category],
      monthlyAmount: subscription.monthlyCost,
    }));

  return {
    profile,
    members: household.members,
    obligations,
    candidates,
    baseline,
    plan,
    balances,
    ownershipIncomplete:
      household.members.length > 1 &&
      household.connections.some((connection) => !connection.memberId),
    error: transactions.error ?? accounts.error,
  };
}

export type PlanSimulation = {
  extraMonthly: number;
  desiredMonthlyCost: number | null;
  targetAge: number | null;
  realReturn: number | null;
};

/**
 * O mesmo plano com hipóteses trocadas: guardar mais por mês, outro custo de
 * vida, outra idade-alvo ou outro retorno. Não salva nada.
 */
export async function simulateFinancialPlan(
  simulation: PlanSimulation,
  now = new Date(),
): Promise<{ base: FinancialPlan; simulated: FinancialPlan }> {
  const result = await getFinancialPlan(now);
  const extra = Math.max(
    -result.baseline.typicalIncome,
    simulation.extraMonthly,
  );

  const simulated = buildFinancialPlan({
    baseline: {
      ...result.baseline,
      savingsCapacity: result.baseline.savingsCapacity + extra,
    },
    profile: {
      ...result.profile,
      desiredMonthlyCost:
        simulation.desiredMonthlyCost ?? result.profile.desiredMonthlyCost,
      targetIndependenceAge:
        simulation.targetAge ?? result.profile.targetIndependenceAge,
      expectedRealReturn:
        simulation.realReturn ?? result.profile.expectedRealReturn,
    },
    obligations: result.obligations,
    balances: result.balances,
    existingGoalNames: [],
    now,
  });

  return { base: result.plan, simulated };
}
