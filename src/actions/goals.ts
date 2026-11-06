"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { evaluateGoal, type GoalEvaluation } from "@/lib/goals";
import { prisma } from "@/lib/prisma";

export type GoalView = GoalEvaluation & {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
};

const MAX_NAME_LENGTH = 60;

function readMoney(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const negative = value.trim().startsWith("-");
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const amount = Number(normalized.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(amount)) return null;
  return ((negative ? -1 : 1) * Math.round(amount * 100)) / 100;
}

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function listGoals(now = new Date()): Promise<GoalView[]> {
  await verifySession();

  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "asc" } });

  return goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    emoji: goal.emoji,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    targetDate: goal.targetDate,
    ...evaluateGoal({ ...goal, now }),
  }));
}

export async function createGoal(formData: FormData) {
  await verifySession();

  const name = readText(formData, "name").slice(0, MAX_NAME_LENGTH);
  const emoji = [...readText(formData, "emoji")].slice(0, 2).join("") || "🎯";
  const targetAmount = readMoney(formData.get("targetAmount"));
  const savedAmount = readMoney(formData.get("savedAmount")) ?? 0;
  const targetDate = readText(formData, "targetDate");

  if (!name || !targetAmount || targetAmount <= 0) return;

  await prisma.goal.create({
    data: {
      name,
      emoji,
      targetAmount,
      savedAmount: Math.max(0, savedAmount),
      targetDate: /^\d{4}-\d{2}$/.test(targetDate) ? targetDate : null,
    },
  });
  revalidatePath("/", "layout");
}

/** Guarda (valor positivo) ou retira (negativo) dinheiro de uma meta. */
export async function addToGoal(formData: FormData) {
  await verifySession();

  const id = readText(formData, "goalId");
  const amount = readMoney(formData.get("amount"));
  const goal = id ? await prisma.goal.findUnique({ where: { id } }) : null;

  if (!goal || !amount) return;

  const savedAmount = Math.max(
    0,
    Math.round((goal.savedAmount + amount) * 100) / 100,
  );

  await prisma.goal.update({
    where: { id },
    data: {
      savedAmount,
      completedAt:
        savedAmount >= goal.targetAmount
          ? (goal.completedAt ?? new Date())
          : null,
    },
  });
  revalidatePath("/", "layout");
}

export async function deleteGoal(formData: FormData) {
  await verifySession();

  const id = readText(formData, "goalId");
  if (id) await prisma.goal.deleteMany({ where: { id } });
  revalidatePath("/", "layout");
}
