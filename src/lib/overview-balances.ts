import type { Account } from "pluggy-sdk";

import { getBankDisplayName, getBankLogoPath } from "./bank-assets";

export type OverviewBalanceAccountInput = Pick<
  Account,
  | "id"
  | "itemId"
  | "type"
  | "subtype"
  | "number"
  | "balance"
  | "name"
  | "marketingName"
  | "currencyCode"
  | "creditData"
>;

export type OverviewAccountBalance = {
  id: string;
  bankName: string;
  bankLogoPath: string | null;
  accountLabel: string;
  accountCount: number;
  balance: number;
  currencyCode: Account["currencyCode"];
};

export type OverviewCreditCardLimit = {
  id: string;
  bankName: string;
  bankLogoPath: string | null;
  name: string;
  lastFourDigits: string;
  availableAmount: number | null;
  creditLimit: number | null;
  currencyCode: Account["currencyCode"];
};

export type OverviewBalances = {
  accounts: OverviewAccountBalance[];
  totalAccountBalance: number;
  totalAccountCount: number;
  accountCurrencyCode: Account["currencyCode"];
  cards: OverviewCreditCardLimit[];
  totalAvailableCredit: number | null;
  totalCreditLimit: number | null;
  creditCurrencyCode: Account["currencyCode"];
};

function getBankDetails(
  accounts: readonly OverviewBalanceAccountInput[],
  account: OverviewBalanceAccountInput,
) {
  const identities = accounts
    .filter((candidate) => candidate.itemId === account.itemId)
    .flatMap((candidate) => [candidate.name, candidate.marketingName]);

  return {
    bankName: getBankDisplayName(...identities),
    bankLogoPath: getBankLogoPath(...identities),
  };
}

function isCreditCard(account: OverviewBalanceAccountInput) {
  return account.type === "CREDIT" || account.subtype === "CREDIT_CARD";
}

function getAccountLabel(account: OverviewBalanceAccountInput) {
  return account.subtype === "SAVINGS_ACCOUNT" ? "Poupança" : "Conta corrente";
}

function toFiniteAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNonNegativeAmount(value: number | null | undefined) {
  const amount = toFiniteAmount(value);

  return amount === null ? null : Math.max(0, amount);
}

function toAbsoluteAmount(value: number | null | undefined) {
  const amount = toFiniteAmount(value);

  return amount === null ? null : Math.abs(amount);
}

function getLastFourDigits(number: string) {
  const digits = number.replace(/\D/gu, "");

  return digits.slice(-4) || "—";
}

function sumKnownAmounts(values: readonly (number | null)[]) {
  if (values.length === 0) {
    return 0;
  }

  if (values.some((value) => value === null)) {
    return null;
  }

  const knownValues = values.filter((value): value is number => value !== null);

  return roundAmount(knownValues.reduce((total, value) => total + value, 0));
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function getAvailableCredit(account: OverviewBalanceAccountInput) {
  const reportedAvailable = toNonNegativeAmount(
    account.creditData?.availableCreditLimit,
  );
  const creditLimit = toAbsoluteAmount(account.creditData?.creditLimit);

  if (reportedAvailable !== null) {
    return reportedAvailable;
  }

  if (creditLimit === null) {
    return null;
  }

  return Math.max(0, creditLimit - (toAbsoluteAmount(account.balance) ?? 0));
}

export function summarizeOverviewBalances(
  accounts: readonly OverviewBalanceAccountInput[],
): OverviewBalances {
  const bankAccounts = accounts.filter((account) => !isCreditCard(account));
  const creditCards = accounts.filter(isCreditCard);
  const accountCurrencyCode = bankAccounts[0]?.currencyCode ?? "BRL";
  const creditCurrencyCode =
    creditCards[0]?.currencyCode ?? accountCurrencyCode;
  const accountGroups = new Map<
    string,
    {
      id: string;
      bankName: string;
      bankLogoPath: string | null;
      accountLabels: Set<string>;
      accountCount: number;
      balance: number;
      currencyCode: Account["currencyCode"];
    }
  >();

  for (const account of bankAccounts) {
    const bankDetails = getBankDetails(accounts, account);
    const key = `${bankDetails.bankName}-${account.currencyCode}`;
    const accountGroup = accountGroups.get(key);

    if (accountGroup) {
      accountGroup.accountLabels.add(getAccountLabel(account));
      accountGroup.accountCount += 1;
      accountGroup.balance += toFiniteAmount(account.balance) ?? 0;
      continue;
    }

    accountGroups.set(key, {
      id: key,
      ...bankDetails,
      accountLabels: new Set([getAccountLabel(account)]),
      accountCount: 1,
      balance: toFiniteAmount(account.balance) ?? 0,
      currencyCode: account.currencyCode,
    });
  }

  const accountViews = [...accountGroups.values()].map((accountGroup) => ({
    id: accountGroup.id,
    bankName: accountGroup.bankName,
    bankLogoPath: accountGroup.bankLogoPath,
    accountLabel:
      accountGroup.accountCount === 1
        ? [...accountGroup.accountLabels][0]
        : `${accountGroup.accountCount} contas`,
    accountCount: accountGroup.accountCount,
    balance: roundAmount(accountGroup.balance),
    currencyCode: accountGroup.currencyCode,
  }));
  const cardViews = creditCards.map((account) => ({
    id: account.id,
    ...getBankDetails(accounts, account),
    name: account.name.trim() || account.creditData?.level?.trim() || "Cartão",
    lastFourDigits: getLastFourDigits(account.number),
    availableAmount: getAvailableCredit(account),
    creditLimit: toAbsoluteAmount(account.creditData?.creditLimit),
    currencyCode: account.currencyCode,
  }));

  return {
    accounts: accountViews,
    totalAccountBalance: roundAmount(
      accountViews.reduce((total, account) => total + account.balance, 0),
    ),
    totalAccountCount: bankAccounts.length,
    accountCurrencyCode,
    cards: cardViews,
    totalAvailableCredit: sumKnownAmounts(
      cardViews.map((card) => card.availableAmount),
    ),
    totalCreditLimit: sumKnownAmounts(
      cardViews.map((card) => card.creditLimit),
    ),
    creditCurrencyCode,
  };
}
