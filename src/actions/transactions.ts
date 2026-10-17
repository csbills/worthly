"use server";

import type { PluggyClient, Transaction } from "pluggy-sdk";
import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import { getPluggyClient } from "@/lib/pluggy";
import { getBankDisplayName, getBankLogoPath } from "../lib/bank-assets";
import { getTransactionCategory } from "../lib/transaction-category-dictionary";
import {
  defaultTransactionFilters,
  filterAndSortTransactions,
  resolveTransactionPeriod,
  type TransactionFilters,
} from "../lib/transaction-filters";
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

export type TransactionAccountFilterOption = {
  id: string;
  name: string;
  logoPath: string | null;
  typeLabel: "Conta" | "Cartão";
  accountNumber: string;
};

export type TransactionCategoryFilterOption = {
  label: string;
  icon: string;
};

export type TransactionsResult = {
  period: {
    key: string;
    label: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
  accountCount: number;
  transactions: CurrentMonthTransaction[];
  filterOptions: {
    accounts: TransactionAccountFilterOption[];
    categories: TransactionCategoryFilterOption[];
  };
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

function getLocalDateKey(date: Date) {
  const parts = getDateParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function belongsToPeriod(
  date: Date,
  period: Pick<TransactionsResult["period"], "dateFrom" | "dateTo">,
) {
  const dateKey = getLocalDateKey(date);

  return (
    (!period.dateFrom || dateKey >= period.dateFrom) &&
    (!period.dateTo || dateKey < period.dateTo)
  );
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
  client: PluggyClient,
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

function getAccountFilterOption(
  account: ConnectedAccount,
  bank: AccountBankDetails,
): TransactionAccountFilterOption {
  return {
    id: account.id,
    name: getBankDisplayName(bank.name),
    logoPath: bank.logoPath,
    typeLabel:
      account.type === "CREDIT" || account.subtype === "CREDIT_CARD"
        ? "Cartão"
        : "Conta",
    accountNumber: account.number,
  };
}

function getCategoryFilterOptions(
  transactions: readonly CurrentMonthTransaction[],
): TransactionCategoryFilterOption[] {
  const categories = new Map<string, TransactionCategoryFilterOption>();

  for (const transaction of transactions) {
    if (!categories.has(transaction.categoryLabel)) {
      categories.set(transaction.categoryLabel, {
        label: transaction.categoryLabel,
        icon: transaction.categoryIcon,
      });
    }
  }

  return [...categories.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR"),
  );
}

export async function getTransactions(
  filters: TransactionFilters = defaultTransactionFilters,
): Promise<TransactionsResult> {
  const resolvedPeriod = resolveTransactionPeriod(
    filters.period,
    new Date(),
    filters.dateFrom,
    filters.dateTo,
  );
  const emptyFilterOptions = { accounts: [], categories: [] };
  const accountResult = await getConnectedAccounts();

  if (accountResult.accounts.length === 0) {
    return {
      period: resolvedPeriod,
      accountCount: 0,
      transactions: [],
      filterOptions: emptyFilterOptions,
      error: accountResult.error,
    };
  }

  try {
    const client = await getPluggyClient();
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
    const transactionOptions =
      resolvedPeriod.dateFrom && resolvedPeriod.dateTo
        ? {
            dateFrom: resolvedPeriod.dateFrom,
            dateTo: resolvedPeriod.dateTo,
          }
        : undefined;
    const transactionResults = await Promise.allSettled(
      accountResult.accounts.map(async (account) => {
        const transactionsPromise = transactionOptions
          ? client.fetchAllTransactions(account.id, transactionOptions)
          : client.fetchAllTransactions(account.id);
        const [transactions, bank] = await Promise.all([
          transactionsPromise,
          getBankDetails(account),
        ]);

        return transactions
          .filter((transaction) =>
            belongsToPeriod(transaction.date, resolvedPeriod),
          )
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
    const serializedTransactions = transactionRecords.map(
      ({ transaction, account, bank }) =>
        serializeTransaction(
          transaction,
          account,
          bank,
          internalTransferIds,
          connectedAccountNumbers,
        ),
    );
    const transactions = filterAndSortTransactions(
      serializedTransactions,
      filters,
    );
    const filterAccounts = await Promise.all(
      accountResult.accounts.map(async (account) =>
        getAccountFilterOption(account, await getBankDetails(account)),
      ),
    );
    const hasError = transactionResults.some(
      (result) => result.status === "rejected",
    );

    return {
      period: resolvedPeriod,
      accountCount: accountResult.accounts.length,
      transactions,
      filterOptions: {
        accounts: filterAccounts,
        categories: getCategoryFilterOptions(serializedTransactions),
      },
      error:
        accountResult.error ??
        (hasError
          ? "Não foi possível carregar as transações de uma ou mais contas."
          : null),
    };
  } catch {
    return {
      period: resolvedPeriod,
      accountCount: accountResult.accounts.length,
      transactions: [],
      filterOptions: emptyFilterOptions,
      error: "Não foi possível consultar as transações na Pluggy.",
    };
  }
}

export async function getCurrentMonthTransactions(): Promise<CurrentMonthTransactionsResult> {
  const month = getCurrentMonth();
  const result = await getTransactions({
    ...defaultTransactionFilters,
    showHidden: true,
  });

  return {
    month: { key: month.key, label: month.label },
    accountCount: result.accountCount,
    transactions: result.transactions,
    error: result.error,
  };
}
