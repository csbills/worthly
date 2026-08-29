"use server";

import type { Transaction } from "pluggy-sdk";

import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import { getPluggyClient } from "@/lib/pluggy";

const timeZone = "America/Sao_Paulo";

export type CurrentMonthTransaction = Pick<
  Transaction,
  | "id"
  | "accountId"
  | "type"
  | "amount"
  | "balance"
  | "currencyCode"
  | "category"
  | "status"
> & {
  date: string;
  description: string;
  accountName: string;
  accountNumber: string;
};

export type CurrentMonthTransactionsResult = {
  month: {
    key: string;
    label: string;
  };
  accountCount: number;
  transactions: CurrentMonthTransaction[];
  error: string | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function getCurrentMonth() {
  const currentDate = getDateParts(new Date());
  const nextMonth =
    currentDate.month === 12
      ? { year: currentDate.year + 1, month: 1 }
      : { year: currentDate.year, month: currentDate.month + 1 };
  const key = `${currentDate.year}-${pad(currentDate.month)}`;
  const labelDate = new Date(
    Date.UTC(currentDate.year, currentDate.month - 1, 1, 12),
  );

  return {
    key,
    label: new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      month: "long",
      year: "numeric",
    }).format(labelDate),
    dateFrom: `${key}-01`,
    dateTo: `${nextMonth.year}-${pad(nextMonth.month)}-01`,
  };
}

function belongsToMonth(date: Date, monthKey: string) {
  const parts = getDateParts(date);
  return `${parts.year}-${pad(parts.month)}` === monthKey;
}

function serializeTransaction(
  transaction: Transaction,
  account: ConnectedAccount,
): CurrentMonthTransaction {
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    date: transaction.date.toISOString(),
    description:
      transaction.description?.trim() ||
      transaction.descriptionRaw?.trim() ||
      "Transação sem descrição",
    type: transaction.type,
    amount: transaction.amount,
    balance: transaction.balance,
    currencyCode: transaction.currencyCode,
    category: transaction.category,
    status: transaction.status,
    accountName: account.marketingName || account.name || "Conta sem nome",
    accountNumber: account.number,
  };
}

export async function getCurrentMonthTransactions(): Promise<CurrentMonthTransactionsResult> {
  const month = getCurrentMonth();
  const accountResult = await getConnectedAccounts();

  if (accountResult.accounts.length === 0) {
    return {
      month: { key: month.key, label: month.label },
      accountCount: 0,
      transactions: [],
      error: accountResult.error,
    };
  }

  try {
    const client = getPluggyClient();
    const transactionResults = await Promise.allSettled(
      accountResult.accounts.map(async (account) => {
        const transactions = await client.fetchAllTransactions(account.id, {
          dateFrom: month.dateFrom,
          dateTo: month.dateTo,
        });

        return transactions
          .filter((transaction) => belongsToMonth(transaction.date, month.key))
          .map((transaction) => serializeTransaction(transaction, account));
      }),
    );
    const transactions = transactionResults
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .sort((left, right) => right.date.localeCompare(left.date));
    const hasError = transactionResults.some(
      (result) => result.status === "rejected",
    );

    return {
      month: { key: month.key, label: month.label },
      accountCount: accountResult.accounts.length,
      transactions,
      error:
        accountResult.error ??
        (hasError
          ? "Não foi possível carregar as transações de uma ou mais contas."
          : null),
    };
  } catch {
    return {
      month: { key: month.key, label: month.label },
      accountCount: accountResult.accounts.length,
      transactions: [],
      error: "Não foi possível consultar as transações na Pluggy.",
    };
  }
}
