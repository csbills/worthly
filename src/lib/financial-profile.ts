import type { PlanProfile } from "@/lib/financial-plan";

export type FinancialProfileView = PlanProfile & {
  mainGoal: string;
  notes: string | null;
  /** O usuário já salvou o perfil pelo menos uma vez. */
  saved: boolean;
};

export const defaultFinancialProfile: FinancialProfileView = {
  householdType: "couple",
  dependents: 0,
  incomeStability: "stable",
  incomeEarners: 1,
  birthYear: null,
  targetIndependenceAge: null,
  desiredMonthlyCost: null,
  expectedRealReturn: 4,
  withdrawalRate: 4,
  emergencyMonths: null,
  mainGoal: "independence",
  notes: null,
  saved: false,
};
