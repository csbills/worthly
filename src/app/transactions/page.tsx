import Image from "next/image";

import {
  type CurrentMonthTransaction,
  getTransactions,
} from "@/actions/transactions";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  TransactionsFilters,
  TransactionsSearch,
} from "@/components/transactions-filters";
import { getBankDisplayName } from "@/lib/bank-assets";
import {
  normalizeTransactionFilters,
  type TransactionFilterInput,
} from "@/lib/transaction-filters";
import { summarizeTransactions } from "@/lib/transaction-summary";

export const dynamic = "force-dynamic";

const timeZone = "America/Sao_Paulo";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatSignedCurrency(amount: number, currencyCode: string) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";

  return `${sign}${formatCurrency(Math.abs(amount), currencyCode)}`;
}

function formatAmount(transaction: CurrentMonthTransaction) {
  return formatSignedCurrency(
    transaction.type === "CREDIT"
      ? Math.abs(transaction.amount)
      : -Math.abs(transaction.amount),
    transaction.currencyCode,
  );
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  return initials || "?";
}

function TransactionRow({
  transaction,
}: {
  transaction: CurrentMonthTransaction;
}) {
  const amountClassName =
    transaction.type === "CREDIT"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  const bankName = getBankDisplayName(transaction.bankName);

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="min-w-64 px-4 py-4 align-top">
        <p className="font-medium">{transaction.description}</p>
      </td>
      <td className="min-w-40 px-4 py-4 align-top text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-base leading-none">
            {transaction.categoryIcon}
          </span>
          <span>{transaction.categoryLabel}</span>
        </span>
      </td>
      <td className="min-w-64 px-4 py-4 align-top">
        <div className="flex min-w-0 items-center gap-3">
          {transaction.bankLogoPath ? (
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background">
              <Image
                src={transaction.bankLogoPath}
                alt=""
                width={36}
                height={36}
                className="size-full object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground"
            >
              {getInitials(bankName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{bankName}</p>
          </div>
        </div>
      </td>
      <td className="w-36 px-4 py-4 align-top text-sm whitespace-nowrap text-muted-foreground">
        {formatDate(transaction.date)}
      </td>
      <td className="w-40 px-4 py-4 text-right align-top whitespace-nowrap">
        <p className={`font-semibold ${amountClassName}`}>
          {formatAmount(transaction)}
        </p>
      </td>
    </tr>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionFilterInput>;
}) {
  const filters = normalizeTransactionFilters(await searchParams);
  const result = await getTransactions(filters);
  const summary = summarizeTransactions(result.transactions);
  const summaryCurrency =
    result.transactions.find((transaction) => transaction.currencyCode)
      ?.currencyCode ?? "BRL";

  return (
    <DashboardShell>
      <h1 className="sr-only">Transações</h1>

      <TransactionsFilters filters={filters} options={result.filterOptions} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.total === 1 ? "transação" : "transações"} no mês
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Receitas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.receipts, summaryCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Despesas</p>
          <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(summary.expenses, summaryCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Saldo</p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              summary.balance < 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatSignedCurrency(summary.balance, summaryCurrency)}
          </p>
        </div>
      </div>

      {result.error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          {result.error}
        </p>
      ) : null}

      <section className="min-w-0 rounded-2xl border bg-card shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b p-4 md:flex-row md:items-center md:p-5">
          <TransactionsSearch initialValue={filters.search} />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {result.transactions.length}{" "}
              {result.transactions.length === 1 ? "transação" : "transações"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{result.period.label}</span>
          </div>
        </div>

        {result.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Descrição
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Categoria
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Conta
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Data
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="font-medium">Nenhuma transação encontrada</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Ajuste os filtros ou verifique se a conexão já sincronizou os
              dados.
            </p>
            <a
              href="/accounts"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Gerenciar contas
            </a>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
