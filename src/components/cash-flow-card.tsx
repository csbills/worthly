import {
  ArrowUpRight02Icon,
  ChartDownIcon,
  ChartUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { CashFlowSummary } from "@/lib/cash-flow";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)}%`;
}

function getBalanceClassName(value: number) {
  if (value > 0) {
    return "text-success-foreground";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

function getSavingsRateClassName(value: number | null) {
  if (value === null) {
    return "bg-muted text-muted-foreground";
  }

  return value >= 0
    ? "bg-success/10 text-success-foreground"
    : "bg-destructive/10 text-destructive";
}

export function CashFlowCard({
  current,
  previous,
  previousMonthLabel,
}: {
  current: CashFlowSummary;
  previous: CashFlowSummary;
  currentMonthLabel: string;
  previousMonthLabel: string;
}) {
  const balanceDifference = current.balance - previous.balance;
  const comparisonClassName = getBalanceClassName(balanceDifference);
  const comparisonIcon = balanceDifference < 0 ? ChartDownIcon : ChartUpIcon;

  return (
    <section className="col-span-12 flex min-w-0 flex-col surface p-5 md:p-6 lg:col-span-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm text-muted-foreground">Fluxo de caixa</h2>
        </div>
        <a
          href="/transactions"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver detalhes
          <HugeiconsIcon
            icon={ArrowUpRight02Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
        </a>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p
          className={`text-[1.75rem] leading-none font-normal tracking-[-0.035em] tabular-nums md:text-[2rem] ${getBalanceClassName(current.balance)}`}
        >
          {formatCurrency(current.balance)}
        </p>
        <p className="text-sm font-medium text-muted-foreground">
          saldo do mês
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="mt-1 text-base font-medium text-success-foreground tabular-nums">
            {formatCurrency(current.receipts)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="mt-1 text-base font-medium text-destructive tabular-nums">
            {formatCurrency(current.expenses)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
        <span
          className={`rounded-md px-2 py-1 font-medium tabular-nums ${getSavingsRateClassName(current.savingsRate)}`}
        >
          Poupança {formatPercentage(current.savingsRate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {balanceDifference !== 0 ? (
            <HugeiconsIcon
              icon={comparisonIcon}
              aria-hidden="true"
              className={`size-3.5 ${comparisonClassName}`}
              strokeWidth={2}
            />
          ) : null}
          <span>
            {balanceDifference === 0
              ? `igual a ${previousMonthLabel}`
              : `${formatSignedCurrency(balanceDifference)} vs. ${previousMonthLabel}`}
          </span>
        </span>
      </div>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Capacidade estimada de aporte</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Após as despesas do mês
            </p>
          </div>
          <p
            className={`shrink-0 text-base font-medium tabular-nums ${getBalanceClassName(current.estimatedInvestmentCapacity)}`}
          >
            {formatCurrency(current.estimatedInvestmentCapacity)}
          </p>
        </div>
      </div>
    </section>
  );
}
