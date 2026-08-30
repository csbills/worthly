"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { PortfolioCategorySummary } from "@/lib/portfolio";
import { portfolioCategoryColors } from "@/lib/portfolio";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PortfolioAllocationChart({
  categories,
  currencyCode,
}: {
  categories: PortfolioCategorySummary[];
  currencyCode: string;
}) {
  const chartData = categories.filter((category) => category.balance > 0);
  const totalBalance = chartData.reduce(
    (total, category) => total + category.balance,
    0,
  );

  if (chartData.length === 0 || totalBalance <= 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
        Sem saldo disponível para distribuir.
      </div>
    );
  }

  return (
    <div
      className="relative h-64 w-full"
      role="img"
      aria-label={`Alocação da carteira em ${currencyCode}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="balance"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            stroke="var(--card)"
            strokeWidth={4}
          >
            {chartData.map((category) => (
              <Cell
                key={category.key}
                fill={portfolioCategoryColors[category.key]}
              />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            formatter={(value) => [
              formatCurrency(Number(value), currencyCode),
              "Saldo",
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
        <span className="text-xs text-muted-foreground">Patrimônio</span>
        <span className="mt-1 text-lg font-semibold tabular-nums">
          {formatCurrency(totalBalance, currencyCode)}
        </span>
      </div>
    </div>
  );
}
