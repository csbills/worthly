"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { normalizeRulePattern } from "@/lib/transaction-adjustments";
import {
  getTransactionCategory,
  isKnownTransactionCategoryId,
} from "@/lib/transaction-category-dictionary";

const MAX_NOTE_LENGTH = 280;
const MAX_PATTERN_LENGTH = 80;

export type AdjustmentResult = { ok: true } | { ok: false; message: string };

export type CategoryRuleView = {
  id: string;
  pattern: string;
  categoryId: string;
  categoryLabel: string;
  categoryIcon: string;
};

/**
 * Salva o que o usuário decidiu sobre uma transação e, se pedido, cria uma
 * regra para as parecidas. Os relatórios leem esses ajustes na próxima
 * renderização.
 */
export async function saveTransactionAdjustment(input: {
  transactionId: string;
  categoryId: string | null;
  note: string;
  ignored: boolean;
  /** Trecho da descrição para "aplicar às parecidas". */
  rulePattern?: string | null;
}): Promise<AdjustmentResult> {
  await verifySession();

  const transactionId = input.transactionId.trim();
  const categoryId = input.categoryId?.trim() || null;
  const note = input.note.trim().slice(0, MAX_NOTE_LENGTH) || null;
  const rulePattern = input.rulePattern?.trim().slice(0, MAX_PATTERN_LENGTH);

  if (!transactionId) {
    return { ok: false, message: "Transação inválida." };
  }

  if (categoryId && !isKnownTransactionCategoryId(categoryId)) {
    return { ok: false, message: "Categoria desconhecida." };
  }

  if (rulePattern !== undefined && rulePattern !== null) {
    if (!categoryId) {
      return {
        ok: false,
        message: "Escolha uma categoria para criar a regra.",
      };
    }
    if (!normalizeRulePattern(rulePattern)) {
      return {
        ok: false,
        message: "O trecho da regra precisa ter pelo menos 2 letras.",
      };
    }
  }

  const values = { categoryId, note, ignored: input.ignored };

  await prisma.transactionOverride.upsert({
    where: { transactionId },
    create: { transactionId, ...values },
    update: values,
  });

  if (rulePattern && categoryId) {
    await prisma.categoryRule.create({
      data: { pattern: rulePattern, categoryId },
    });
  }

  revalidatePath("/", "layout");

  return { ok: true };
}

export async function listCategoryRules(): Promise<CategoryRuleView[]> {
  await verifySession();

  const rules = await prisma.categoryRule.findMany({
    orderBy: { createdAt: "asc" },
  });

  return rules.map((rule) => {
    const category = getTransactionCategory(rule.categoryId, null);

    return {
      id: rule.id,
      pattern: rule.pattern,
      categoryId: rule.categoryId,
      categoryLabel: category.label,
      categoryIcon: category.icon,
    };
  });
}

export async function deleteCategoryRule(
  id: string,
): Promise<AdjustmentResult> {
  await verifySession();

  await prisma.categoryRule.delete({ where: { id } });
  revalidatePath("/", "layout");

  return { ok: true };
}

/** Versão para <form action>: o id vem no campo "ruleId". */
export async function removeCategoryRule(formData: FormData) {
  const id = formData.get("ruleId");

  if (typeof id === "string" && id) {
    await deleteCategoryRule(id);
  }
}
