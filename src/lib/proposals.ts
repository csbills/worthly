/**
 * Propostas de ação do Tito. O modelo só escolhe a intenção e os parâmetros
 * (nomes, valores, datas); o app valida, calcula com o motor determinístico,
 * guarda a proposta e só a aplica quando o usuário confirma. O cartão mostra
 * os números do motor — nunca números escritos pelo modelo.
 */

import type { GoalSchedule } from "@/lib/goal-planner";

export type ProposedGoal = {
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  /** YYYY-MM */
  targetMonth: string;
  priority: number;
};

export type ProposedBudget = {
  groupId: string;
  label: string;
  icon: string;
  /** Limite mensal sugerido (gasto típico menos a economia). */
  amount: number;
};

export type GoalProposalPayload = {
  goals: ProposedGoal[];
  budgets: ProposedBudget[];
};

export type ProposalStatus = "pending" | "applied" | "dismissed";

export type ProposalView = {
  id: string;
  kind: "goals";
  status: ProposalStatus;
  payload: GoalProposalPayload;
  schedule: GoalSchedule;
  createdAt: string;
};

/** Orçamentos que transformam as economias sugeridas em limites. */
export function budgetsFromSavings(schedule: GoalSchedule): ProposedBudget[] {
  return schedule.savings.map((saving) => ({
    groupId: saving.groupId,
    label: saving.label,
    icon: saving.icon,
    amount: Math.max(0, Math.round((saving.typical - saving.cut) / 10) * 10),
  }));
}

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return value === "pending" || value === "applied" || value === "dismissed";
}
