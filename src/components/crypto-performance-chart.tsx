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

import type { CryptoHistoryPoint } from "@/lib/crypto-market";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function CryptoPerformanceChart({
  history,
  currencyCode,
}: {
  history: CryptoHistoryPoint[];
  currencyCode: string;
}) {
  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-center text-sm text-muted-foreground">
        Histórico indisponível para este ativo.
      </div>
    );
  }

  return (
    <div
      className="h-48 w-full"
      role="img"
      aria-label={`Evolução do valor da posição em ${currencyCode}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={history}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) =>
              formatAxisCurrency(value, currencyCode)
            }
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip
            labelFormatter={(value) => formatDate(String(value))}
            formatter={(value) => [
              formatCurrency(Number(value), currencyCode),
              "Valor da posição",
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
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
