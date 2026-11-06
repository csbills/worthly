"use server";

import { revalidatePath } from "next/cache";

import { getFinancialPlan } from "@/actions/financial-plan";
import { listGoals } from "@/actions/goals";
import { verifySession } from "@/lib/auth/dal";
import {
  type GoalSchedule,
  type PlannerGoal,
  planGoals,
} from "@/lib/goal-planner";
import { prisma } from "@/lib/prisma";
import {
  budgetsFromSavings,
  type GoalProposalPayload,
  isProposalStatus,
  type ProposalView,
  type ProposedGoal,
} from "@/lib/proposals";

/** Grupos de gasto que dá para apertar (nunca essenciais nem transferências). */
const notCuttable = new Set(["03000000", "04000000", "05000000"]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

/**
 * Organiza as metas propostas junto com as metas com data que já existem:
 * a sobra é uma só, então o plano precisa enxergar todas.
 */
export async function scheduleGoals(
  proposed: ProposedGoal[],
  now = new Date(),
): Promise<{ schedule: GoalSchedule; payload: GoalProposalPayload }> {
  await verifySession();

  const [result, existing] = await Promise.all([
    getFinancialPlan(now),
    listGoals(now),
  ]);
  const proposedNames = new Set(proposed.map((goal) => normalize(goal.name)));
  const existingGoals: PlannerGoal[] = existing
    .filter(
      (goal) =>
        !goal.done &&
        goal.targetDate &&
        !proposedNames.has(normalize(goal.name)),
    )
    .map((goal) => ({
      key: `goal-${goal.id}`,
      name: goal.name,
      emoji: goal.emoji,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      targetMonth: (goal.targetDate as string).slice(0, 7),
      // Metas que já existem vêm antes das novas no empate.
      priority: 0,
      isNew: false,
    }));
  const newGoals: PlannerGoal[] = proposed.map((goal, index) => ({
    key: `new-${index}`,
    ...goal,
    isNew: true,
  }));

  const schedule = planGoals({
    goals: [...existingGoals, ...newGoals],
    monthlyCapacity: result.baseline.savingsCapacity,
    emergencyGap: result.plan.emergency.gap,
    savingsSources: result.baseline.groups
      .filter((group) => !group.essential && !notCuttable.has(group.groupId))
      .map((group) => ({
        groupId: group.groupId,
        label: group.label,
        icon: group.icon,
        monthlyTypical: group.monthlyTypical,
      })),
    now,
  });

  return {
    schedule,
    payload: { goals: proposed, budgets: budgetsFromSavings(schedule) },
  };
}

function toView(row: {
  id: string;
  kind: string;
  status: string;
  payload: string;
  schedule: string;
  createdAt: Date;
}): ProposalView {
  return {
    id: row.id,
    kind: "goals",
    status: isProposalStatus(row.status) ? row.status : "pending",
    payload: JSON.parse(row.payload) as GoalProposalPayload,
    schedule: JSON.parse(row.schedule) as GoalSchedule,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Guarda a proposta (ainda não aplicada) e devolve o que o cartão mostra. */
export async function createGoalProposal(
  proposed: ProposedGoal[],
  now = new Date(),
): Promise<ProposalView> {
  await verifySession();

  const { schedule, payload } = await scheduleGoals(proposed, now);
  const row = await prisma.assistantProposal.create({
    data: {
      kind: "goals",
      payload: JSON.stringify(payload),
      schedule: JSON.stringify(schedule),
    },
  });

  return toView(row);
}

export async function getProposals(ids: string[]): Promise<ProposalView[]> {
  await verifySession();
  if (ids.length === 0) return [];

  const rows = await prisma.assistantProposal.findMany({
    where: { id: { in: ids } },
  });
  return rows.map(toView);
}

export type ApplyProposalResult =
  | { ok: true; proposal: ProposalView }
  | { ok: false; message: string };

/**
 * Aplica uma proposta pendente: cria as metas e, se pedido, os orçamentos
 * das economias. Usa só o que foi validado e guardado na criação.
 */
export async function applyProposal(
  id: string,
  { includeBudgets = false }: { includeBudgets?: boolean } = {},
): Promise<ApplyProposalResult> {
  await verifySession();

  const row = await prisma.assistantProposal.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "Proposta não encontrada." };
  if (row.status !== "pending") {
    return { ok: false, message: "Esta proposta já foi respondida." };
  }

  const payload = JSON.parse(row.payload) as GoalProposalPayload;
  const updated = await prisma.$transaction(async (tx) => {
    for (const goal of payload.goals) {
      await tx.goal.create({
        data: {
          name: goal.name,
          emoji: goal.emoji,
          targetAmount: goal.targetAmount,
          savedAmount: goal.savedAmount,
          targetDate: goal.targetMonth,
        },
      });
    }
    if (includeBudgets) {
      for (const budget of payload.budgets) {
        await tx.budget.upsert({
          where: { categoryGroupId: budget.groupId },
          create: { categoryGroupId: budget.groupId, amount: budget.amount },
          update: { amount: budget.amount },
        });
      }
    }
    return tx.assistantProposal.update({
      where: { id },
      data: { status: "applied", resolvedAt: new Date() },
    });
  });

  revalidatePath("/", "layout");
  return { ok: true, proposal: toView(updated) };
}

export async function dismissProposal(
  id: string,
): Promise<ApplyProposalResult> {
  await verifySession();

  const row = await prisma.assistantProposal.findUnique({ where: { id } });
  if (!row || row.status !== "pending") {
    return { ok: false, message: "Esta proposta já foi respondida." };
  }

  const updated = await prisma.assistantProposal.update({
    where: { id },
    data: { status: "dismissed", resolvedAt: new Date() },
  });
  return { ok: true, proposal: toView(updated) };
}
