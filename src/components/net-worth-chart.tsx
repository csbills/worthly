"use client";

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

import type { NetWorthHistoryPoint } from "../actions/dashboard";

function formatAxisCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T12:00:00-03:00`));
}

function NetWorthTooltip({
  active,
  label,
  payload,
  currencyCode,
}: TooltipContentProps & { currencyCode: string }) {
  if (!active || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as NetWorthHistoryPoint | undefined;

  if (!point) {
    return null;
  }

  return (
    <div className="w-[216px] overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 text-zinc-100 shadow-[0_16px_36px_rgb(0_0_0_/_0.28)]">
      <div className="px-4 pb-4 pt-3.5">
        <p className="text-base font-semibold">
          {label ? formatDate(String(label)) : formatDate(point.date)}
        </p>
        <div className="mt-4 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full bg-emerald-500"
          />
          <span className="text-sm text-zinc-300">Patrimônio líquido</span>
          <span className="ml-auto text-base font-semibold tabular-nums">
            {formatCurrency(point.netWorth, currencyCode)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function NetWorthChart({
  history,
  currencyCode,
}: {
  history: NetWorthHistoryPoint[];
  currencyCode: string;
}) {
  if (history.length < 2) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-center text-sm leading-6 text-muted-foreground">
        O histórico começa no primeiro snapshot diário. Volte amanhã para ver a
        evolução do patrimônio.
      </div>
    );
  }

  return (
    <div
      className="mt-4 h-52 w-full min-w-0"
      role="img"
      aria-label={`Evolução do patrimônio líquido em ${currencyCode}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={history}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={(value: number) =>
              formatAxisCurrency(value, currencyCode)
            }
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickMargin={8}
          />
          <Tooltip
            content={(props) => (
              <NetWorthTooltip {...props} currencyCode={currencyCode} />
            )}
            cursor={{
              stroke: "var(--muted-foreground)",
              strokeOpacity: 0.65,
              strokeWidth: 1,
            }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#10b981",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
