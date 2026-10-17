import { ArrowUpRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { SpendingPaceResult } from "@/actions/overview";
import { SpendingPaceChart } from "@/components/spending-pace-chart";
import { getSpendingComparison } from "../lib/spending-comparison";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(value));
}

function getComparison(current: number, previous: number) {
  const spendingComparison = getSpendingComparison(current, previous);

  if (spendingComparison.label === "acima") {
    return {
      difference: spendingComparison.difference,
      label: "acima",
      className: "text-destructive",
      badgeClassName: "bg-destructive/10 text-destructive",
      delta:
        spendingComparison.percentage !== null
          ? `+${formatPercentage(spendingComparison.percentage)}%`
          : "novo gasto",
      isAbovePrevious: true,
    };
  }

  if (spendingComparison.label === "abaixo") {
    return {
      difference: spendingComparison.difference,
      label: "abaixo",
      className: "text-success-foreground",
      badgeClassName: "bg-success/10 text-success-foreground",
      delta:
        spendingComparison.percentage !== null
          ? `-${formatPercentage(spendingComparison.percentage)}%`
          : "sem base",
      isAbovePrevious: false,
    };
  }

  return {
    difference: spendingComparison.difference,
    label: "igual",
    className: "text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground",
    delta:
      spendingComparison.percentage !== null
        ? `${formatPercentage(spendingComparison.percentage)}%`
        : "sem base",
    isAbovePrevious: false,
  };
}

type SpendingPaceCardProps = Pick<
  SpendingPaceResult,
  "currentMonth" | "previousMonth" | "points" | "error"
>;

export function SpendingPaceCard({
  currentMonth,
  previousMonth,
  points,
  error,
}: SpendingPaceCardProps) {
  const comparison = getComparison(currentMonth.total, previousMonth.total);

  return (
    <section className="col-span-12 min-w-0 surface p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm text-muted-foreground">Ritmo de gastos</h2>
        <a
          href="/transactions"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todas
          <HugeiconsIcon
            icon={ArrowUpRight02Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
        </a>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-[1.75rem] leading-none font-normal tracking-[-0.035em] tabular-nums md:text-[2rem]">
          {formatCurrency(comparison.difference)}
        </p>
        <p className={`text-sm font-medium ${comparison.className}`}>
          {comparison.label}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums ${comparison.badgeClassName}`}
        >
          {comparison.delta}
        </span>
        <span>vs {formatCurrency(previousMonth.total)} mês anterior</span>
      </div>

      {points.length > 0 ? (
        <SpendingPaceChart
          points={points}
          currentMonthLabel={currentMonth.label}
          previousMonthLabel={previousMonth.label}
          isAbovePrevious={comparison.isAbovePrevious}
        />
      ) : (
        <div className="mt-4 flex h-52 flex-col items-center justify-center rounded-xl bg-muted/30 px-6 text-center">
          <p className="font-medium">
            {error
              ? "Não foi possível carregar o ritmo de gastos"
              : "Nenhuma conta conectada"}
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {error
              ? "Confira a conexão no Meu Pluggy e tente atualizar novamente."
              : "Cadastre um itemId em Contas para acompanhar suas despesas aqui."}
          </p>
          <a
            href="/accounts"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Gerenciar contas
          </a>
        </div>
      )}
    </section>
  );
}
