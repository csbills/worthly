"use server";

import type { Transaction } from "pluggy-sdk";

import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import { getPluggyClient } from "@/lib/pluggy";
import { getBankLogoPath } from "../lib/bank-assets";
import { getTransactionCategory } from "../lib/transaction-category-dictionary";
import {
  getConnectedAccountNumbers,
  getInternalTransferTransactionIds,
  isExcludedFromFinancialReporting,
  withReportingAccountContext,
} from "../lib/transaction-reporting";

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
  bankName: string;
  bankLogoPath: string | null;
  accountName: string;
  accountNumber: string;
  categoryLabel: string;
  categoryIcon: string;
  excludeFromSummary: boolean;
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

type AccountBankDetails = {
  name: string;
  logoPath: string | null;
};

function resolveBankDetails(
  identities: Array<string | null | undefined>,
): AccountBankDetails {
  const names = identities
    .filter((identity): identity is string => Boolean(identity?.trim()))
    .map((identity) => identity.trim());
  const nameWithLogo = names.find((name) => getBankLogoPath(name));
  const name = nameWithLogo || names[0] || "Banco não identificado";

  return {
    name,
    logoPath: getBankLogoPath(name),
  };
}

function getFallbackBankDetails(
  accounts: ConnectedAccount[],
): AccountBankDetails {
  return resolveBankDetails(
    accounts.flatMap((account) => [account.name, account.marketingName]),
  );
}

async function getAccountBankDetails(
  client: ReturnType<typeof getPluggyClient>,
  accounts: ConnectedAccount[],
): Promise<AccountBankDetails> {
  const fallback = getFallbackBankDetails(accounts);

  try {
    const item = await client.fetchItem(accounts[0].itemId);
    return resolveBankDetails([
      ...accounts.flatMap((account) => [account.name, account.marketingName]),
      item.connector?.name,
    ]);
  } catch {
    return fallback;
  }
}

function serializeTransaction(
  transaction: Transaction,
  account: ConnectedAccount,
  bank: AccountBankDetails,
  internalTransferIds: ReadonlySet<string>,
  connectedAccountNumbers: ReadonlySet<string>,
): CurrentMonthTransaction {
  const category = getTransactionCategory(
    transaction.categoryId ?? null,
    transaction.category ?? null,
  );

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
    categoryLabel: category.label,
    categoryIcon: category.icon,
    excludeFromSummary: isExcludedFromFinancialReporting(
      withReportingAccountContext(transaction, account),
      internalTransferIds,
      connectedAccountNumbers,
    ),
    status: transaction.status,
    bankName: bank.name,
    bankLogoPath: bank.logoPath,
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
    const connectedAccountNumbers = getConnectedAccountNumbers(
      accountResult.accounts,
    );
    const accountsByItemId = new Map<string, ConnectedAccount[]>();

    for (const account of accountResult.accounts) {
      const accountsForItem = accountsByItemId.get(account.itemId) ?? [];
      accountsForItem.push(account);
      accountsByItemId.set(account.itemId, accountsForItem);
    }

    const bankDetailsByItemId = new Map<string, Promise<AccountBankDetails>>();
    const getBankDetails = (account: ConnectedAccount) => {
      const existingDetails = bankDetailsByItemId.get(account.itemId);

      if (existingDetails) {
        return existingDetails;
      }

      const details = getAccountBankDetails(
        client,
        accountsByItemId.get(account.itemId) ?? [account],
      );
      bankDetailsByItemId.set(account.itemId, details);

      return details;
    };
    const transactionResults = await Promise.allSettled(
      accountResult.accounts.map(async (account) => {
        const [transactions, bank] = await Promise.all([
          client.fetchAllTransactions(account.id, {
            dateFrom: month.dateFrom,
            dateTo: month.dateTo,
          }),
          getBankDetails(account),
        ]);

        return transactions
          .filter((transaction) => belongsToMonth(transaction.date, month.key))
          .map((transaction) => ({ transaction, account, bank }));
      }),
    );
    const transactionRecords = transactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const internalTransferIds = getInternalTransferTransactionIds(
      transactionRecords.map(({ transaction, account }) =>
        withReportingAccountContext(transaction, account),
      ),
    );
    const transactions = transactionRecords
      .map(({ transaction, account, bank }) =>
        serializeTransaction(
          transaction,
          account,
          bank,
          internalTransferIds,
          connectedAccountNumbers,
        ),
      )
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
