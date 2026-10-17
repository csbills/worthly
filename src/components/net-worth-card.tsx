import { ArrowUpRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import type {
  NetWorthHistoryPoint,
  NetWorthResult,
} from "../actions/dashboard";
import { compareNetWorth } from "../lib/net-worth";
import { NetWorthChart } from "./net-worth-chart";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(value: number, currencyCode: string) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  return sign + formatCurrency(Math.abs(value), currencyCode);
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return null;
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(value))}%`;
}

function getChangeClassName(direction: "increase" | "decrease" | "unchanged") {
  if (direction === "increase") {
    return "bg-success/10 text-success-foreground";
  }

  if (direction === "decrease") {
    return "bg-destructive/10 text-destructive-foreground";
  }

  return "bg-muted text-muted-foreground";
}

function getChangeLabel(direction: "increase" | "decrease" | "unchanged") {
  if (direction === "increase") {
    return "Aumento";
  }

  if (direction === "decrease") {
    return "Redução";
  }

  return "Sem alteração";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

function getPreviousSnapshot(history: NetWorthHistoryPoint[]) {
  if (history.length < 2) {
    return null;
  }

  return history[history.length - 2];
}

type NetWorthCardProps = Pick<
  NetWorthResult,
  "current" | "history" | "currencyCode" | "error"
>;

export function NetWorthCard({
  current,
  history,
  currencyCode,
  error,
}: NetWorthCardProps) {
  const previousSnapshot = getPreviousSnapshot(history);
  const change =
    current && previousSnapshot
      ? compareNetWorth(current.netWorth, previousSnapshot.netWorth)
      : null;

  return (
    <section className="col-span-12 min-w-0 surface p-5 md:p-6 lg:col-span-7">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm text-muted-foreground">Patrimônio líquido</h2>
        <Link
          href="/investments"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ver carteira
          <HugeiconsIcon
            icon={ArrowUpRight02Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
        </Link>
      </div>

      {current ? (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-[1.75rem] leading-none font-normal tracking-[-0.035em] tabular-nums md:text-[2rem]">
              {formatCurrency(current.netWorth, currencyCode)}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              total estimado
            </p>
          </div>

          {change && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span
                className={[
                  "rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums",
                  getChangeClassName(change.direction),
                ].join(" ")}
              >
                {getChangeLabel(change.direction)}{" "}
                {formatSignedCurrency(change.difference, currencyCode)}
              </span>
              {formatPercentage(change.percentage) ? (
                <span>
                  {formatPercentage(change.percentage)} desde o último snapshot
                </span>
              ) : (
                <span>desde o último snapshot</span>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 mb-4">
            <Metric
              label="Contas"
              value={formatCurrency(current.accountBalance, currencyCode)}
            />
            <Metric
              label="Investimentos"
              value={formatCurrency(current.investmentBalance, currencyCode)}
            />
            <Metric
              label="Cartões"
              value={formatCurrency(current.creditUsed, currencyCode)}
            />
          </div>

          <NetWorthChart history={history} currencyCode={currencyCode} />
        </>
      ) : (
        <div className="mt-4 flex min-h-52 items-center justify-center rounded-xl bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
          {error ??
            "Ainda não há dados suficientes para calcular o patrimônio líquido."}
        </div>
      )}
    </section>
  );
}
