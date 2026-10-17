import type { Metadata } from "next";
import Image from "next/image";

import {
  type CurrentMonthTransaction,
  getTransactions,
} from "@/actions/transactions";
import {
  TransactionsFilters,
  TransactionsSearch,
} from "@/components/transactions-filters";
import { buttonVariants } from "@/components/ui/button";
import { Notice, PageHeader } from "@/components/ui/card";
import { getBankDisplayName } from "@/lib/bank-assets";
import {
  normalizeTransactionFilters,
  type TransactionFilterInput,
} from "@/lib/transaction-filters";
import { summarizeTransactions } from "@/lib/transaction-summary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Transações" };

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

/** Pluggy joins description parts with "|"; show them as a readable list. */
function formatDescription(value: string) {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
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

function BankAvatar({
  transaction,
  className = "size-7",
}: {
  transaction: CurrentMonthTransaction;
  className?: string;
}) {
  const bankName = getBankDisplayName(transaction.bankName);

  return transaction.bankLogoPath ? (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background ${className}`}
    >
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
      className={`flex shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-medium text-muted-foreground ${className}`}
    >
      {getInitials(bankName)}
    </span>
  );
}

function getAmountClassName(transaction: CurrentMonthTransaction) {
  return transaction.type === "CREDIT"
    ? "text-success-foreground"
    : "text-destructive-foreground";
}

/** Phone layout: one tappable line per transaction instead of a wide table. */
function TransactionListItem({
  transaction,
}: {
  transaction: CurrentMonthTransaction;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <BankAvatar transaction={transaction} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-5 font-medium break-words">
          {formatDescription(transaction.description)}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true">{transaction.categoryIcon}</span>
          <span className="truncate">{transaction.categoryLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 tabular-nums">
            {formatDate(transaction.date)}
          </span>
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-medium whitespace-nowrap tabular-nums ${getAmountClassName(transaction)}`}
      >
        {formatAmount(transaction)}
      </p>
    </li>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: CurrentMonthTransaction;
}) {
  const amountClassName = getAmountClassName(transaction);
  const bankName = getBankDisplayName(transaction.bankName);

  return (
    <tr className="border-b transition-colors last:border-0 hover:bg-muted">
      <td className="min-w-64 px-5 py-3 align-middle">
        <p className="text-sm font-medium">
          {formatDescription(transaction.description)}
        </p>
      </td>
      <td className="min-w-40 px-4 py-3 align-middle text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2 rounded-full bg-muted py-0.5 pr-2.5 pl-1.5 text-xs">
          <span aria-hidden="true" className="text-sm leading-none">
            {transaction.categoryIcon}
          </span>
          <span>{transaction.categoryLabel}</span>
        </span>
      </td>
      <td className="min-w-56 px-4 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-2.5">
          <BankAvatar transaction={transaction} />
          <div className="min-w-0">
            <p className="truncate text-sm">{bankName}</p>
          </div>
        </div>
      </td>
      <td className="w-36 px-4 py-3 align-middle text-sm whitespace-nowrap text-muted-foreground tabular-nums">
        {formatDate(transaction.date)}
      </td>
      <td className="w-40 px-5 py-3 text-right align-middle whitespace-nowrap">
        <p className={`text-sm font-medium tabular-nums ${amountClassName}`}>
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
    <>
      <PageHeader
        eyebrow={result.period.label}
        title="Transações"
        description="Tudo o que entrou e saiu das suas contas e cartões, categorizado automaticamente."
      />

      <TransactionsFilters filters={filters} options={result.filterOptions} />

      <div className="surface grid grid-cols-2 divide-border xl:grid-cols-4 [&>div]:min-w-0 [&>div]:p-4 sm:[&>div]:p-5 max-xl:[&>div:nth-child(-n+2)]:border-b xl:[&>div:not(:first-child)]:border-l max-xl:[&>div:nth-child(even)]:border-l">
        <div>
          <p className="text-sm text-muted-foreground">Transações</p>
          <p className="mt-2 text-xl font-normal tracking-[-0.03em] whitespace-nowrap tabular-nums sm:text-2xl">
            {summary.total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.total === 1 ? "lançamento" : "lançamentos"} no período
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Receitas</p>
          <p className="mt-2 text-xl font-normal tracking-[-0.03em] whitespace-nowrap tabular-nums sm:text-2xl text-success-foreground">
            {formatCurrency(summary.receipts, summaryCurrency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Despesas</p>
          <p className="mt-2 text-xl font-normal tracking-[-0.03em] whitespace-nowrap tabular-nums sm:text-2xl text-destructive-foreground">
            {formatCurrency(summary.expenses, summaryCurrency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Saldo</p>
          <p
            className={`mt-2 text-xl font-normal tracking-[-0.03em] whitespace-nowrap tabular-nums sm:text-2xl ${
              summary.balance < 0
                ? "text-destructive-foreground"
                : "text-success-foreground"
            }`}
          >
            {formatSignedCurrency(summary.balance, summaryCurrency)}
          </p>
        </div>
      </div>

      {result.error ? <Notice tone="warning">{result.error}</Notice> : null}

      <section className="min-w-0 overflow-hidden surface">
        <div className="flex flex-col justify-between gap-3 border-b px-4 py-4 sm:px-5 md:flex-row md:items-center">
          <TransactionsSearch initialValue={filters.search} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground sm:text-sm">
            <span>
              {result.transactions.length}{" "}
              {result.transactions.length === 1 ? "transação" : "transações"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{result.period.label}</span>
          </div>
        </div>

        {result.transactions.length > 0 ? (
          <>
            <ul className="divide-y md:hidden">
              {result.transactions.map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b bg-muted text-xs text-muted-foreground">
                    <th scope="col" className="px-5 py-2.5 font-normal">
                      Descrição
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-normal">
                      Categoria
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-normal">
                      Conta
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-normal">
                      Data
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-2.5 text-right font-normal"
                    >
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
          </>
        ) : (
          <div className="p-10 text-center">
            <p className="font-medium">Nenhuma transação encontrada</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Ajuste os filtros ou verifique se a conexão já sincronizou os
              dados.
            </p>
            <a
              href="/accounts"
              className={buttonVariants({ className: "mt-5" })}
            >
              Gerenciar conexões
            </a>
          </div>
        )}
      </section>
    </>
  );
}
