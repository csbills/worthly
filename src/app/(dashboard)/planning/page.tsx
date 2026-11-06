import type { Metadata } from "next";
import Link from "next/link";

import {
  type BudgetSuggestion,
  type BudgetView,
  getBudgetsOverview,
  removeBudget,
  saveBudget,
} from "@/actions/budgets";
import {
  addToGoal,
  createGoal,
  deleteGoal,
  type GoalView,
  listGoals,
} from "@/actions/goals";
import { getSubscriptions } from "@/actions/subscriptions";
import { Tito, TitoMessage } from "@/components/mascot/tito";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { selectTriggerVariants } from "@/components/ui/select-variants";
import type { DetectedSubscription } from "@/lib/subscriptions";
import { listTransactionCategoryOptions } from "@/lib/transaction-category-dictionary";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Planejar" };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatShortDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function formatMonth(monthKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T12:00:00Z`));
}

function askTito(question: string) {
  return `/assistant?q=${encodeURIComponent(question)}`;
}

function ProgressBar({
  value,
  tone,
}: {
  value: number;
  tone: "ok" | "warning" | "over" | "goal";
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out-soft",
          tone === "ok" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "over" && "bg-destructive",
          tone === "goal" && "bg-primary",
        )}
        style={{ width: `${Math.min(100, Math.max(2, value * 100))}%` }}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4 md:px-6">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const statusCopy = {
  ok: "No ritmo",
  warning: "Atenção",
  over: "Estourou",
} as const;

function BudgetRow({ budget }: { budget: BudgetView }) {
  return (
    <li className="space-y-2 px-5 py-4 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span aria-hidden="true">{budget.icon}</span>
          <span className="truncate">{budget.label}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-normal",
              budget.status === "ok" && "bg-success/10 text-success-foreground",
              budget.status === "warning" &&
                "bg-warning/15 text-warning-foreground",
              budget.status === "over" &&
                "bg-destructive/10 text-destructive-foreground",
            )}
          >
            {statusCopy[budget.status]}
          </span>
        </p>
        <p className="shrink-0 text-sm tabular-nums">
          {formatCurrency(budget.spent)}
          <span className="text-muted-foreground">
            {" "}
            de {formatCurrency(budget.amount)}
          </span>
        </p>
      </div>
      <ProgressBar value={budget.used} tone={budget.status} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {budget.remaining >= 0
            ? `Restam ${formatCurrency(budget.remaining)}`
            : `${formatCurrency(-budget.remaining)} acima do limite`}
          {" · "}no ritmo atual, fecha em {formatCurrency(budget.projected)}
        </span>
        <details className="group/edit">
          <summary className="cursor-pointer list-none rounded-full px-2 py-0.5 hover:bg-muted hover:text-foreground">
            Ajustar
          </summary>
          <div className="mt-2 flex items-center gap-2">
            <form action={saveBudget} className="flex items-center gap-2">
              <input type="hidden" name="groupId" value={budget.groupId} />
              <Input
                name="amount"
                inputMode="decimal"
                defaultValue={budget.amount.toFixed(2).replace(".", ",")}
                aria-label={`Novo limite para ${budget.label}`}
                className="h-8 w-28"
              />
              <Button type="submit" size="sm">
                Salvar
              </Button>
            </form>
            <form action={removeBudget}>
              <input type="hidden" name="groupId" value={budget.groupId} />
              <Button type="submit" size="sm" variant="ghost">
                Remover
              </Button>
            </form>
          </div>
        </details>
      </div>
    </li>
  );
}

function BudgetSuggestionRow({ suggestion }: { suggestion: BudgetSuggestion }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3 md:px-6">
      <p className="min-w-0 text-sm">
        <span aria-hidden="true">{suggestion.icon} </span>
        {suggestion.label}
        <span className="block text-xs text-muted-foreground">
          Você costuma gastar perto de {formatCurrency(suggestion.suggested)}{" "}
          por mês
        </span>
      </p>
      <form action={saveBudget}>
        <input type="hidden" name="groupId" value={suggestion.groupId} />
        <input type="hidden" name="amount" value={suggestion.suggested} />
        <Button type="submit" size="sm" variant="outline">
          Criar de {formatCurrency(suggestion.suggested)}
        </Button>
      </form>
    </li>
  );
}

function NewBudgetForm({ budgeted }: { budgeted: Set<string> }) {
  const groups = listTransactionCategoryOptions().filter(
    (group) => !budgeted.has(group.id) && group.id !== "01000000",
  );

  return (
    <form
      action={saveBudget}
      className="flex flex-wrap items-end gap-2 px-5 py-4 md:px-6"
    >
      <label className="min-w-44 flex-1 space-y-1 text-xs text-muted-foreground">
        Categoria
        <select
          name="groupId"
          required
          className={cn(selectTriggerVariants(), "appearance-auto")}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.icon} {group.label}
            </option>
          ))}
        </select>
      </label>
      <label
        htmlFor="new-budget-amount"
        className="w-32 space-y-1 text-xs text-muted-foreground"
      >
        Limite por mês
        <Input
          id="new-budget-amount"
          name="amount"
          inputMode="decimal"
          placeholder="500,00"
          required
        />
      </label>
      <Button type="submit">Criar orçamento</Button>
    </form>
  );
}

const cadenceCopy = {
  weekly: "toda semana",
  monthly: "todo mês",
  yearly: "todo ano",
} as const;

function SubscriptionRow({
  subscription,
}: {
  subscription: DetectedSubscription;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3 md:px-6">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{subscription.name}</span>
          {subscription.isNew ? (
            <span className="rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-normal text-info-foreground">
              Nova
            </span>
          ) : null}
          {subscription.priceChange && subscription.priceChange > 0 ? (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-normal text-warning-foreground">
              +{Math.round(subscription.priceChange * 100)}%
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatCurrency(subscription.lastAmount)}{" "}
          {cadenceCopy[subscription.cadence]} · próxima por volta de{" "}
          {formatShortDate(subscription.nextDate)}
        </p>
      </div>
      <p className="shrink-0 text-right text-sm tabular-nums">
        {formatCurrency(subscription.monthlyCost)}
        <span className="block text-xs text-muted-foreground">por mês</span>
      </p>
    </li>
  );
}

function GoalCard({ goal }: { goal: GoalView }) {
  return (
    <li className="surface space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <span aria-hidden="true" className="text-xl">
            {goal.emoji}
          </span>
          <span className="truncate">{goal.name}</span>
        </p>
        {goal.done ? <Tito mood="celebrate" size="sm" /> : null}
      </div>
      <div className="space-y-1.5">
        <p className="text-sm tabular-nums">
          {formatCurrency(goal.savedAmount)}
          <span className="text-muted-foreground">
            {" "}
            de {formatCurrency(goal.targetAmount)}
          </span>
        </p>
        <ProgressBar value={goal.progress} tone="goal" />
        <p className="text-xs text-muted-foreground">
          {goal.done
            ? "Meta batida! 🎉"
            : goal.monthlyNeeded && goal.targetDate
              ? `Guarde ${formatCurrency(goal.monthlyNeeded)} por mês até ${formatMonth(goal.targetDate)}`
              : `Faltam ${formatCurrency(goal.remaining)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={addToGoal} className="flex items-center gap-2">
          <input type="hidden" name="goalId" value={goal.id} />
          <Input
            name="amount"
            inputMode="decimal"
            placeholder="100,00"
            aria-label={`Valor para ${goal.name} (negativo para retirar)`}
            className="h-8 w-24"
          />
          <Button type="submit" size="sm" variant="outline">
            Guardar
          </Button>
        </form>
        <form action={deleteGoal}>
          <input type="hidden" name="goalId" value={goal.id} />
          <Button type="submit" size="sm" variant="ghost">
            Apagar
          </Button>
        </form>
      </div>
    </li>
  );
}

function NewGoalForm({ open }: { open: boolean }) {
  return (
    <details open={open} className="surface p-4">
      <summary className="cursor-pointer list-none text-sm font-medium">
        + Nova meta
      </summary>
      <form action={createGoal} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label
          htmlFor="new-goal-name"
          className="space-y-1 text-xs text-muted-foreground sm:col-span-2"
        >
          Nome
          <div className="flex gap-2">
            <Input
              name="emoji"
              defaultValue="🎯"
              aria-label="Emoji"
              className="w-14 text-center"
            />
            <Input
              id="new-goal-name"
              name="name"
              required
              maxLength={60}
              placeholder="Reserva de emergência"
            />
          </div>
        </label>
        <label
          htmlFor="new-goal-target"
          className="space-y-1 text-xs text-muted-foreground"
        >
          Quanto juntar
          <Input
            id="new-goal-target"
            name="targetAmount"
            inputMode="decimal"
            required
            placeholder="10.000,00"
          />
        </label>
        <label
          htmlFor="new-goal-saved"
          className="space-y-1 text-xs text-muted-foreground"
        >
          Já guardado
          <Input
            id="new-goal-saved"
            name="savedAmount"
            inputMode="decimal"
            placeholder="0,00"
          />
        </label>
        <label
          htmlFor="new-goal-date"
          className="space-y-1 text-xs text-muted-foreground"
        >
          Até quando (opcional)
          <Input id="new-goal-date" name="targetDate" type="month" />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Criar meta
          </Button>
        </div>
      </form>
    </details>
  );
}

export default async function PlanningPage() {
  const [budgets, subscriptions, goals] = await Promise.all([
    getBudgetsOverview(),
    getSubscriptions(),
    listGoals(),
  ]);
  const budgeted = new Set(budgets.budgets.map((budget) => budget.groupId));
  const needsAttention = budgets.budgets.filter(
    (budget) => budget.status !== "ok",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={budgets.monthLabel}
        title="Planejar"
        description="Orçamentos, assinaturas e metas: o que você quer que o seu dinheiro faça."
        actions={
          <Link
            href="/categories"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Gastos por categoria
          </Link>
        }
      />

      {budgets.error ? <Notice tone="warning">{budgets.error}</Notice> : null}

      <div className="stagger grid gap-5 lg:grid-cols-2">
        <section className="surface overflow-hidden lg:col-span-2">
          <SectionHeader
            title="Orçamentos do mês"
            description={
              budgets.budgets.length > 0
                ? `${formatCurrency(budgets.totalSpent)} de ${formatCurrency(budgets.totalBudget)} planejados${needsAttention ? ` · ${needsAttention} pedindo atenção` : ""}`
                : "Defina quanto quer gastar por categoria e acompanhe o mês."
            }
            action={
              needsAttention ? (
                <Link
                  href={askTito(
                    "Meus orçamentos estão apertados. Onde posso economizar até o fim do mês?",
                  )}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Pedir ajuda ao Tito
                </Link>
              ) : null
            }
          />
          {budgets.budgets.length > 0 ? (
            <ul className="divide-y">
              {budgets.budgets.map((budget) => (
                <BudgetRow key={budget.groupId} budget={budget} />
              ))}
            </ul>
          ) : null}
          {budgets.suggestions.length > 0 ? (
            <div className="border-t">
              <p className="flex items-center gap-2 px-5 pt-4 text-xs text-muted-foreground md:px-6">
                <Tito mood="idle" size="xs" animated={false} />
                Sugestões do Tito, pela média dos últimos meses
              </p>
              <ul className="divide-y">
                {budgets.suggestions.map((suggestion) => (
                  <BudgetSuggestionRow
                    key={suggestion.groupId}
                    suggestion={suggestion}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          <div className="border-t">
            <NewBudgetForm budgeted={budgeted} />
          </div>
        </section>

        <section className="surface overflow-hidden">
          <SectionHeader
            title="Assinaturas e recorrentes"
            description={
              subscriptions.subscriptions.length > 0
                ? `${formatCurrency(subscriptions.monthlyTotal)} por mês · ${formatCurrency(subscriptions.yearlyTotal)} por ano`
                : undefined
            }
            action={
              subscriptions.subscriptions.length > 0 ? (
                <Link
                  href={askTito(
                    "Olhe minhas assinaturas e cobranças recorrentes. Alguma parece esquecida ou cara demais?",
                  )}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Revisar com o Tito
                </Link>
              ) : null
            }
          />
          {subscriptions.subscriptions.length > 0 ? (
            <ul className="divide-y">
              {subscriptions.subscriptions.map((subscription) => (
                <SubscriptionRow
                  key={subscription.key}
                  subscription={subscription}
                />
              ))}
            </ul>
          ) : (
            <TitoMessage
              mood="ball"
              size="md"
              title="Nenhuma cobrança recorrente"
            >
              Quando a mesma cobrança aparecer por dois meses seguidos, ela vem
              para cá.
            </TitoMessage>
          )}
        </section>

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-medium">Metas</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Junte dinheiro para o que importa e acompanhe o caminho.
            </p>
          </div>
          {goals.length > 0 ? (
            <ul className="grid gap-3">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </ul>
          ) : null}
          <NewGoalForm open={goals.length === 0} />
        </section>
      </div>
    </>
  );
}
