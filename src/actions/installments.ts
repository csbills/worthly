"use server";

import type { CreditCardBills, PluggyClient, Transaction } from "pluggy-sdk";
import { type ConnectedAccount, getConnectedAccounts } from "@/actions/pluggy";
import { verifySession } from "@/lib/auth/dal";
import { getPluggyClient } from "@/lib/pluggy";
import { getBankDisplayName, getBankLogoPath } from "../lib/bank-assets";
import {
  buildInstallments,
  type InstallmentCardBilling,
  type InstallmentSourceTransaction,
  type InstallmentSummary,
  type InstallmentView,
  summarizeInstallments,
} from "../lib/installments";
import { getTransactionCategory } from "../lib/transaction-category-dictionary";

export type InstallmentsResult = {
  cardCount: number;
  installments: InstallmentView[];
  summary: InstallmentSummary;
  error: string | null;
};

type BankDetails = {
  bankName: string;
  bankLogoPath: string | null;
};

type CreditCardBillingSource = Pick<
  CreditCardBills,
  "dueDate" | "billClosingDate"
>;

function isCreditCard(account: ConnectedAccount) {
  return account.type === "CREDIT" || account.subtype === "CREDIT_CARD";
}

function resolveBankDetails(
  accounts: ConnectedAccount[],
  connectorName?: string | null,
): BankDetails {
  const identities = [
    connectorName,
    ...accounts.flatMap((account) => [account.name, account.marketingName]),
  ];

  return {
    bankName: getBankDisplayName(...identities),
    bankLogoPath: getBankLogoPath(...identities),
  };
}

async function getBankDetails(
  client: PluggyClient,
  accounts: ConnectedAccount[],
): Promise<BankDetails> {
  const fallback = resolveBankDetails(accounts);

  try {
    const item = await client.fetchItem(accounts[0].itemId);

    return resolveBankDetails(accounts, item.connector?.name);
  } catch {
    return fallback;
  }
}

function getUtcDay(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCDate();
}

function getLatestBillingSource(
  bills: CreditCardBillingSource[],
): CreditCardBillingSource | null {
  return bills.reduce<CreditCardBillingSource | null>((latest, bill) => {
    if (!latest) {
      return bill;
    }

    const latestDate = latest.dueDate ?? latest.billClosingDate;
    const billDate = bill.dueDate ?? bill.billClosingDate;

    return billDate.getTime() > latestDate.getTime() ? bill : latest;
  }, null);
}

function getCreditCardBilling(
  account: ConnectedAccount,
  bills: CreditCardBillingSource[],
): InstallmentCardBilling | null {
  const latestBill = getLatestBillingSource(bills);
  const dueDay =
    getUtcDay(latestBill?.dueDate) ??
    getUtcDay(account.creditData?.balanceDueDate);
  const closingDay =
    getUtcDay(latestBill?.billClosingDate) ??
    getUtcDay(account.creditData?.balanceCloseDate);

  if (dueDay === null && closingDay === null) {
    return null;
  }

  return { closingDay, dueDay };
}

async function getCreditCardBillingFromPluggy(
  client: PluggyClient,
  account: ConnectedAccount,
) {
  try {
    const response = await client.fetchCreditCardBills(account.id, {
      pageSize: 50,
    });

    return getCreditCardBilling(account, response.results);
  } catch {
    return getCreditCardBilling(account, []);
  }
}

function toInstallmentSourceTransaction(
  transaction: Transaction,
  account: ConnectedAccount,
  bank: BankDetails,
  creditCardBilling: InstallmentCardBilling | null,
): InstallmentSourceTransaction {
  const category = getTransactionCategory(
    transaction.categoryId ?? null,
    transaction.category ?? null,
  );
  const metadata = transaction.creditCardMetadata;

  return {
    id: transaction.id,
    accountId: transaction.accountId,
    date: transaction.date.toISOString(),
    description:
      transaction.description?.trim() ||
      transaction.descriptionRaw?.trim() ||
      "Compra parcelada",
    amount: transaction.amount,
    type: transaction.type,
    status: transaction.status ?? "POSTED",
    updatedAt: transaction.updatedAt.toISOString(),
    currencyCode: transaction.currencyCode,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    categoryColor: category.color,
    bankName: bank.bankName,
    bankLogoPath: bank.bankLogoPath,
    cardNumber: metadata?.cardNumber ?? account.number ?? null,
    creditCardBilling,
    creditCardMetadata: metadata
      ? {
          installmentNumber: metadata.installmentNumber,
          totalInstallments: metadata.totalInstallments,
          totalAmount: metadata.totalAmount ?? null,
          purchaseDate: metadata.purchaseDate?.toISOString() ?? null,
          billId: metadata.billId ?? null,
          cardNumber: metadata.cardNumber ?? null,
        }
      : null,
  };
}

function emptyResult(cardCount = 0, error: string | null = null) {
  const installments: InstallmentView[] = [];

  return {
    cardCount,
    installments,
    summary: summarizeInstallments(installments),
    error,
  } satisfies InstallmentsResult;
}

export async function getInstallments(): Promise<InstallmentsResult> {
  await verifySession();

  const accountResult = await getConnectedAccounts();
  const creditAccounts = accountResult.accounts.filter(isCreditCard);

  if (creditAccounts.length === 0) {
    return emptyResult(0, accountResult.error);
  }

  try {
    const client = await getPluggyClient();
    const accountsByItemId = new Map<string, ConnectedAccount[]>();

    for (const account of accountResult.accounts) {
      const accountsForItem = accountsByItemId.get(account.itemId) ?? [];
      accountsForItem.push(account);
      accountsByItemId.set(account.itemId, accountsForItem);
    }

    const bankDetailsByItemId = new Map<string, Promise<BankDetails>>();
    const getBankDetailsForAccount = (account: ConnectedAccount) => {
      const existingDetails = bankDetailsByItemId.get(account.itemId);

      if (existingDetails) {
        return existingDetails;
      }

      const details = getBankDetails(
        client,
        accountsByItemId.get(account.itemId) ?? [account],
      );
      bankDetailsByItemId.set(account.itemId, details);

      return details;
    };
    const transactionResults = await Promise.allSettled(
      creditAccounts.map(async (account) => {
        const [transactions, bank, creditCardBilling] = await Promise.all([
          client.fetchAllTransactions(account.id),
          getBankDetailsForAccount(account),
          getCreditCardBillingFromPluggy(client, account),
        ]);

        return transactions.map((transaction) =>
          toInstallmentSourceTransaction(
            transaction,
            account,
            bank,
            creditCardBilling,
          ),
        );
      }),
    );
    const sourceTransactions = transactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const installments = buildInstallments(sourceTransactions);
    const hasError = transactionResults.some(
      (result) => result.status === "rejected",
    );

    return {
      cardCount: creditAccounts.length,
      installments,
      summary: summarizeInstallments(installments),
      error:
        accountResult.error ??
        (hasError
          ? "Não foi possível carregar os parcelamentos de um ou mais cartões."
          : null),
    };
  } catch {
    return emptyResult(
      creditAccounts.length,
      "Não foi possível consultar os parcelamentos na Pluggy.",
    );
  }
}
