"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";

import type { PortfolioCategorySummary } from "@/lib/portfolio";
import { portfolioCategoryColors } from "@/lib/portfolio";
import { getPortfolioAllocationTooltipAssets } from "@/lib/portfolio-display";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)}%`;
}

function PortfolioAllocationTooltip({
  active,
  payload = [],
  currencyCode,
}: {
  active?: boolean;
  payload?: TooltipContentProps["payload"];
  currencyCode: string;
}) {
  if (!active || payload.length === 0) {
    return null;
  }

  const category = payload[0]?.payload as PortfolioCategorySummary | undefined;

  if (!category) {
    return null;
  }

  const assets = getPortfolioAllocationTooltipAssets(category.assets);
  const categoryColor = portfolioCategoryColors[category.key];

  return (
    <div className="w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 text-zinc-100 shadow-[0_16px_36px_rgb(0_0_0_/_0.28)]">
      <div className="px-4 pb-3.5 pt-3.5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <p className="truncate text-base font-medium">{category.label}</p>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">Saldo</span>
            <span className="text-base font-medium tabular-nums">
              {formatCurrency(category.balance, currencyCode)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">Na carteira</span>
            <span className="text-sm font-medium text-zinc-300 tabular-nums">
              {formatPercentage(category.percentageOfPortfolio)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-700/80 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium tracking-[0.08em] text-zinc-400 uppercase">
            Ativos
          </p>
          <span className="text-xs text-zinc-500">{category.assetCount}</span>
        </div>
        {assets.length > 0 ? (
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 rounded-lg px-1 py-1"
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-zinc-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">
                    {asset.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
                    {formatPercentage(asset.percentageOfCategory)} da categoria
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-zinc-100 tabular-nums">
                  {formatCurrency(asset.balance, currencyCode)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum ativo disponível.</p>
        )}
      </div>
    </div>
  );
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
            content={<PortfolioAllocationTooltip currencyCode={currencyCode} />}
            isAnimationActive={false}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Patrimônio</span>
        <span className="mt-1 text-lg font-medium tabular-nums">
          {formatCurrency(totalBalance, currencyCode)}
        </span>
      </div>
    </div>
  );
}
