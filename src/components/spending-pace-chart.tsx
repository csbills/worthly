"use client";

import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import type { SpendingPacePoint } from "@/actions/overview";
import { summarizeSpendingPaceTooltip } from "@/lib/spending-pace-tooltip";

const currentAboveColor = "var(--destructive)";
const currentBelowColor = "var(--success)";

function formatAxisValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTooltipCurrency(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTooltipDifference(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${sign}${formatTooltipCurrency(Math.abs(value))}`;
}

function SpendingPaceTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as SpendingPacePoint | undefined;

  if (!point) {
    return null;
  }

  const currentValue = point.current ?? null;
  const previousValue = point.previous ?? null;
  const summary = summarizeSpendingPaceTooltip(currentValue, previousValue);
  const isDecrease = summary?.direction === "decrease";
  const isUnchanged = summary?.direction === "unchanged";
  const comparisonLabel = isDecrease
    ? "Redução"
    : isUnchanged
      ? "Sem alteração"
      : "Aumento";
  const comparisonIcon = isDecrease ? ChartDownIcon : ChartUpIcon;
  const comparisonClassName = isUnchanged
    ? "bg-zinc-800/70 text-zinc-300"
    : isDecrease
      ? "bg-emerald-950/50 text-emerald-400"
      : "bg-red-950/50 text-red-400";

  return (
    <div className="w-[232px] overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 text-zinc-100 shadow-[0_16px_36px_rgb(0_0_0_/_0.28)]">
      <div className="px-4 pb-4 pt-3.5">
        <p className="text-base font-medium">Dia {label ?? point.day}</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full bg-emerald-500"
            />
            <span className="text-sm text-zinc-300">Este mês</span>
            <span className="ml-auto text-base font-medium tabular-nums">
              {formatTooltipCurrency(currentValue)}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full bg-zinc-500"
            />
            <span className="text-sm text-zinc-300">Mês passado</span>
            <span className="ml-auto text-base font-medium text-zinc-400 tabular-nums">
              {formatTooltipCurrency(previousValue)}
            </span>
          </div>
        </div>
      </div>

      {summary ? (
        <div
          className={`flex items-center gap-2 border-t border-zinc-700/80 px-4 py-3 ${comparisonClassName}`}
        >
          <HugeiconsIcon
            icon={comparisonIcon}
            aria-hidden="true"
            className="size-4 shrink-0"
            strokeWidth={2}
          />
          <p className="min-w-0 text-sm leading-5">
            <span className="font-medium">{comparisonLabel}</span>
            <span className="font-medium">
              {formatTooltipDifference(summary.difference)}
            </span>
            {summary.percentage !== null ? (
              <span className="ml-1 text-xs opacity-70">
                ({summary.percentage}%)
              </span>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function SpendingPaceChart({
  points,
  currentMonthLabel,
  previousMonthLabel,
  isAbovePrevious,
}: {
  points: SpendingPacePoint[];
  currentMonthLabel: string;
  previousMonthLabel: string;
  isAbovePrevious: boolean;
}) {
  const currentColor = isAbovePrevious ? currentAboveColor : currentBelowColor;
  const xAxisTicks = [1, Math.ceil(points.length / 2), points.length].filter(
    (tick, index, ticks) => ticks.indexOf(tick) === index,
  );

  return (
    <div className="mt-4 min-w-0">
      <div
        className="h-52 w-full"
        role="img"
        aria-label={`Ritmo de gastos: ${currentMonthLabel} comparado com ${previousMonthLabel}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="2 5"
            />
            <XAxis
              dataKey="day"
              ticks={xAxisTicks}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
              tickMargin={10}
            />
            <YAxis
              width={58}
              tickLine={false}
              axisLine={false}
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
              tickFormatter={formatAxisValue}
              tickMargin={8}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={SpendingPaceTooltip}
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeOpacity: 0.65,
                strokeWidth: 1,
              }}
              filterNull={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="previous"
              name="previous"
              stroke="var(--muted-foreground)"
              strokeWidth={1.75}
              strokeDasharray="6 5"
              strokeOpacity={0.7}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="current"
              stroke={currentColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: currentColor,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
          Este mês
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-5"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--muted-foreground) 55%, transparent 55%)",
              backgroundSize: "7px 100%",
            }}
          />
          Mês passado
        </span>
      </div>
    </div>
  );
}
