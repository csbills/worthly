"use client";

import type { CurrencyCode } from "pluggy-sdk";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategorySpendingGroup } from "@/actions/categories";

function formatCurrency(value: number, currencyCode: CurrencyCode) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

export function CategorySpendingChart({
  groups,
  total,
  currencyCode,
}: {
  groups: CategorySpendingGroup[];
  total: number;
  currencyCode: CurrencyCode;
}) {
  const chartData = groups.filter((group) => group.amount > 0);

  if (chartData.length === 0 || total <= 0) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
        Sem gastos para distribuir.
      </div>
    );
  }

  return (
    <div
      className="relative h-56 w-full"
      role="img"
      aria-label={`Distribuição dos gastos de ${formatCurrency(total, currencyCode)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={86}
            paddingAngle={3}
            stroke="var(--card)"
            strokeWidth={4}
          >
            {chartData.map((group) => (
              <Cell key={group.key} fill={group.color} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            formatter={(value) => [
              formatCurrency(Number(value), currencyCode),
              "Gasto",
            ]}
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
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="mt-1 text-lg font-semibold tabular-nums">
          {formatCurrency(total, currencyCode)}
        </span>
      </div>
    </div>
  );
}
