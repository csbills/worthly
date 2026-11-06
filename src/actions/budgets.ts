"use server";

import { revalidatePath } from "next/cache";

import {
  type CategorySpendingResult,
  getCategorySpending,
} from "@/actions/categories";
import { verifySession } from "@/lib/auth/dal";
import {
  type BudgetEvaluation,
  evaluateBudget,
  suggestBudgetAmount,
} from "@/lib/budgets";
import { prisma } from "@/lib/prisma";
import {
  listTransactionCategoryOptions,
  transactionCategoryGroupColors,
} from "@/lib/transaction-category-dictionary";

const timeZone = "America/Sao_Paulo";
const MAX_SUGGESTIONS = 4;

export type BudgetView = BudgetEvaluation & {
  groupId: string;
  label: string;
  icon: string;
  color: string;
};

export type BudgetSuggestion = {
  groupId: string;
  label: string;
  icon: string;
  /** Média dos últimos meses, arredondada. */
  suggested: number;
  spentThisMonth: number;
};

export type BudgetsOverview = {
  monthLabel: string;
  budgets: BudgetView[];
  suggestions: BudgetSuggestion[];
  totalBudget: number;
  totalSpent: number;
  error: string | null;
};

function todayInSaoPaulo(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);

  return {
    day: Number(parts.day),
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

export async function getBudgetsOverview(
  now = new Date(),
): Promise<BudgetsOverview> {
  await verifySession();

  const [current, budgets] = await Promise.all([
    getCategorySpending(),
    prisma.budget.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  // Os três meses fechados anteriores servem de base para as sugestões.
  const history: CategorySpendingResult[] = [];
  let previousKey = current.month.previousKey;
  for (let index = 0; index < 3; index += 1) {
    const month = await getCategorySpending(previousKey);
    history.push(month);
    previousKey = month.month.previousKey;
  }
  const groupsInfo = new Map(
    listTransactionCategoryOptions().map((group) => [group.id, group]),
  );
  const spentByGroup = new Map(
    current.groups.map((group) => [group.key, group.amount]),
  );
  const { day, daysInMonth } = todayInSaoPaulo(now);

  const budgetViews: BudgetView[] = budgets.map((budget) => {
    const info = groupsInfo.get(budget.categoryGroupId);
    return {
      groupId: budget.categoryGroupId,
      label: info?.label ?? "Categoria",
      icon: info?.icon ?? "📦",
      color:
        transactionCategoryGroupColors[budget.categoryGroupId] ?? "#94a3b8",
      ...evaluateBudget({
        amount: budget.amount,
        spent: spentByGroup.get(budget.categoryGroupId) ?? 0,
        dayOfMonth: day,
        daysInMonth,
      }),
    };
  });

  const budgeted = new Set(budgets.map((budget) => budget.categoryGroupId));
  const candidateGroups = new Map<string, { label: string; icon: string }>();
  for (const month of [current, ...history]) {
    for (const group of month.groups) {
      if (!budgeted.has(group.key) && !candidateGroups.has(group.key)) {
        candidateGroups.set(group.key, {
          label: group.label,
          icon: group.icon,
        });
      }
    }
  }

  const suggestions = [...candidateGroups.entries()]
    .flatMap(([groupId, info]) => {
      const suggested = suggestBudgetAmount(
        history.map(
          (month) =>
            month.groups.find((group) => group.key === groupId)?.amount ?? 0,
        ),
      );
      return suggested
        ? [
            {
              groupId,
              ...info,
              suggested,
              spentThisMonth: spentByGroup.get(groupId) ?? 0,
            },
          ]
        : [];
    })
    .sort((a, b) => b.suggested - a.suggested)
    .slice(0, MAX_SUGGESTIONS);

  return {
    monthLabel: current.month.label,
    budgets: budgetViews.sort((a, b) => b.used - a.used),
    suggestions,
    totalBudget: budgetViews.reduce((sum, budget) => sum + budget.amount, 0),
    totalSpent: budgetViews.reduce((sum, budget) => sum + budget.spent, 0),
    error: current.error,
  };
}

function readAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  // Aceita "1.234,56", "1234,56" e "1234.56".
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const amount = Number(normalized.replace(/[^\d.]/g, ""));

  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100) / 100
    : null;
}

export async function saveBudget(formData: FormData) {
  await verifySession();

  const groupId = formData.get("groupId");
  const amount = readAmount(formData.get("amount"));
  const knownGroup =
    typeof groupId === "string" &&
    listTransactionCategoryOptions().some((group) => group.id === groupId);

  if (!knownGroup || amount === null) return;

  await prisma.budget.upsert({
    where: { categoryGroupId: groupId },
    create: { categoryGroupId: groupId, amount },
    update: { amount },
  });
  revalidatePath("/", "layout");
}

export async function removeBudget(formData: FormData) {
  await verifySession();

  const groupId = formData.get("groupId");

  if (typeof groupId === "string") {
    await prisma.budget.deleteMany({ where: { categoryGroupId: groupId } });
  }
  revalidatePath("/", "layout");
}
