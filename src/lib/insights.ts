/**
 * Avisos do Tito: o que merece a atenção do usuário agora. Módulo puro —
 * recebe orçamentos, assinaturas, faturas e o ritmo do mês já calculados.
 */

import type { TitoMood } from "@/components/mascot/tito";

export type InsightTone = "warning" | "info" | "success";

export type Insight = {
  id: string;
  tone: InsightTone;
  mood: TitoMood;
  title: string;
  detail: string;
  href: string;
  /** Pergunta pronta para continuar a conversa com o Tito. */
  ask: string | null;
};

export type InsightInput = {
  now: Date;
  budgets: {
    groupId: string;
    label: string;
    status: "ok" | "warning" | "over";
    spent: number;
    amount: number;
    projected: number;
  }[];
  subscriptions: {
    key: string;
    name: string;
    lastAmount: number;
    priceChange: number | null;
    isNew: boolean;
  }[];
  cards: {
    id: string;
    name: string;
    openBalanceAmount: number;
    openDueDate: string | null;
  }[];
  pace: {
    elapsedDays: number;
    current: number | null;
    previous: number | null;
    previousLabel: string;
  } | null;
  goals: { id: string; name: string; done: boolean; progress: number }[];
};

const DAY_MS = 86_400_000;
const DUE_SOON_DAYS = 5;
const MAX_INSIGHTS = 4;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function daysUntil(isoDate: string, now: Date) {
  const target = Date.parse(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T12:00:00Z`);
  return Math.round((target - today) / DAY_MS);
}

const toneOrder: Record<InsightTone, number> = {
  warning: 0,
  info: 1,
  success: 2,
};

export function buildInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];

  for (const card of input.cards) {
    if (!card.openDueDate || card.openBalanceAmount <= 0) continue;
    const days = daysUntil(card.openDueDate, input.now);
    if (days < 0 || days > DUE_SOON_DAYS) continue;
    insights.push({
      id: `card-due-${card.id}`,
      tone: "warning",
      mood: "worried",
      title:
        days === 0
          ? `A fatura do ${card.name} vence hoje`
          : `A fatura do ${card.name} vence em ${days} ${days === 1 ? "dia" : "dias"}`,
      detail: `${formatCurrency(card.openBalanceAmount)} em aberto.`,
      href: "/credit-cards",
      ask: null,
    });
  }

  for (const budget of input.budgets) {
    if (budget.status === "over") {
      insights.push({
        id: `budget-over-${budget.groupId}`,
        tone: "warning",
        mood: "worried",
        title: `${budget.label} passou do orçamento`,
        detail: `${formatCurrency(budget.spent)} de ${formatCurrency(budget.amount)} este mês.`,
        href: "/planning",
        ask: `Gastei mais do que planejei com ${budget.label}. O que puxou esse valor para cima?`,
      });
    } else if (budget.status === "warning") {
      insights.push({
        id: `budget-warning-${budget.groupId}`,
        tone: "warning",
        mood: "thinking",
        title: `${budget.label} está perto do limite`,
        detail: `No ritmo atual o mês fecha em ${formatCurrency(budget.projected)}, para um limite de ${formatCurrency(budget.amount)}.`,
        href: "/planning",
        ask: `Como fico dentro do orçamento de ${budget.label} até o fim do mês?`,
      });
    }
  }

  const pace = input.pace;
  if (
    pace &&
    pace.elapsedDays >= 7 &&
    pace.current !== null &&
    pace.previous !== null &&
    pace.previous > 0 &&
    pace.current > pace.previous * 1.15
  ) {
    const percent = Math.round((pace.current / pace.previous - 1) * 100);
    insights.push({
      id: "pace-above",
      tone: "info",
      mood: "thinking",
      title: `Você está gastando ${percent}% mais que em ${pace.previousLabel}`,
      detail: `${formatCurrency(pace.current)} até o dia ${pace.elapsedDays}, contra ${formatCurrency(pace.previous)} no mesmo ponto do mês passado.`,
      href: "/",
      ask: "Por que estou gastando mais que no mês passado?",
    });
  }

  for (const subscription of input.subscriptions) {
    if (subscription.priceChange !== null && subscription.priceChange > 0) {
      insights.push({
        id: `subscription-price-${subscription.key}`,
        tone: "info",
        mood: "thinking",
        title: `${subscription.name} ficou ${Math.round(subscription.priceChange * 100)}% mais cara`,
        detail: `A última cobrança foi de ${formatCurrency(subscription.lastAmount)}.`,
        href: "/planning",
        ask: null,
      });
    } else if (subscription.isNew) {
      insights.push({
        id: `subscription-new-${subscription.key}`,
        tone: "info",
        mood: "idle",
        title: `Nova cobrança recorrente: ${subscription.name}`,
        detail: `${formatCurrency(subscription.lastAmount)} por vez. Foi você que assinou?`,
        href: "/planning",
        ask: null,
      });
    }
  }

  for (const goal of input.goals) {
    if (goal.done) {
      insights.push({
        id: `goal-done-${goal.id}`,
        tone: "success",
        mood: "celebrate",
        title: `Meta batida: ${goal.name}!`,
        detail: "Você chegou lá. Hora de comemorar (com moderação).",
        href: "/planning",
        ask: null,
      });
    }
  }

  return insights
    .map((insight, index) => ({ insight, index }))
    .sort(
      (a, b) =>
        toneOrder[a.insight.tone] - toneOrder[b.insight.tone] ||
        a.index - b.index,
    )
    .slice(0, MAX_INSIGHTS)
    .map(({ insight }) => insight);
}
