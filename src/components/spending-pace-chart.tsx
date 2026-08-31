"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SpendingPacePoint } from "@/actions/overview";

const currentAboveColor = "var(--destructive)";
const currentBelowColor = "#15803d";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
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
              cursor={{ stroke: "var(--border)" }}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "current" ? "Este mês" : "Mês passado",
              ]}
              labelFormatter={(label) => `Dia ${label}`}
              contentStyle={{
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                backgroundColor: "var(--card)",
                color: "var(--card-foreground)",
                boxShadow: "0 8px 24px rgb(0 0 0 / 0.08)",
              }}
              itemStyle={{ color: "var(--card-foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
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
