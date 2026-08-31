import type { Account } from "pluggy-sdk";

export type CreditCardSourceAccount = Pick<
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

export type CreditCardBankDetails = {
  bankName: string;
  bankLogoPath: string | null;
};

export type CreditCardView = {
  id: string;
  itemId: string;
  name: string;
  level: string | null;
  brand: string | null;
  bankName: string;
  bankLogoPath: string | null;
  lastFourDigits: string;
  statementAmount: number;
  dueDate: string | null;
  creditLimit: number | null;
  usedAmount: number;
  availableAmount: number | null;
  currencyCode: Account["currencyCode"];
  status: NonNullable<Account["creditData"]>["status"] | null;
};

export function formatCreditCardDueDate(date: string | null) {
  if (!date) {
    return "Não informado";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(parsedDate);
}

function toNonNegativeAmount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
}

function toAbsoluteAmount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.abs(value);
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getLastFourDigits(number: string) {
  const digits = number.replace(/\D/gu, "");

  return digits.slice(-4) || "—";
}

export function normalizeCreditCard(
  account: CreditCardSourceAccount,
  bank: CreditCardBankDetails,
): CreditCardView {
  const creditData = account.creditData;
  const statementAmount = toAbsoluteAmount(account.balance) ?? 0;
  const creditLimit = toAbsoluteAmount(creditData?.creditLimit);
  const reportedAvailableAmount = toNonNegativeAmount(
    creditData?.availableCreditLimit,
  );
  const usedAmount =
    creditLimit !== null && reportedAvailableAmount !== null
      ? Math.min(
          creditLimit,
          Math.max(0, creditLimit - reportedAvailableAmount),
        )
      : statementAmount;
  const availableAmount =
    reportedAvailableAmount ??
    (creditLimit !== null ? Math.max(0, creditLimit - usedAmount) : null);

  return {
    id: account.id,
    itemId: account.itemId,
    name: account.name.trim() || "Cartão",
    level: creditData?.level?.trim() || null,
    brand: creditData?.brand?.trim() || null,
    bankName: bank.bankName,
    bankLogoPath: bank.bankLogoPath,
    lastFourDigits: getLastFourDigits(account.number),
    statementAmount,
    dueDate: toIsoDate(creditData?.balanceDueDate),
    creditLimit,
    usedAmount,
    availableAmount,
    currencyCode: account.currencyCode,
    status: creditData?.status ?? null,
  };
}
