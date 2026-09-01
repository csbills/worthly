import type { Account, CreditCardBills } from "pluggy-sdk";

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

export type CreditCardBillSource = Pick<
  CreditCardBills,
  "id" | "dueDate" | "billClosingDate" | "totalAmount"
>;

export type CreditCardBillView = {
  id: string;
  amount: number;
  closingDate: string | null;
  dueDate: string | null;
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
  openBalanceAmount: number;
  openDueDate: string | null;
  latestClosedBill: CreditCardBillView | null;
  billError: string | null;
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

function getDateTimestamp(value: Date | string | null | undefined) {
  const isoDate = toIsoDate(value);

  if (!isoDate) {
    return Number.NEGATIVE_INFINITY;
  }

  return new Date(isoDate).getTime();
}

function getLatestBill(bills: CreditCardBillSource[]) {
  return bills.reduce<CreditCardBillSource | null>((latest, bill) => {
    if (!latest) {
      return bill;
    }

    const latestTimestamp = getDateTimestamp(
      latest.billClosingDate ?? latest.dueDate,
    );
    const billTimestamp = getDateTimestamp(
      bill.billClosingDate ?? bill.dueDate,
    );

    return billTimestamp > latestTimestamp ? bill : latest;
  }, null);
}

function toBillView(
  bill: CreditCardBillSource | null,
): CreditCardBillView | null {
  if (!bill) {
    return null;
  }

  return {
    id: bill.id,
    amount: toAbsoluteAmount(bill.totalAmount) ?? 0,
    closingDate: toIsoDate(bill.billClosingDate),
    dueDate: toIsoDate(bill.dueDate),
  };
}

function getNonExpiredDate(value: Date | string | null | undefined, now: Date) {
  const isoDate = toIsoDate(value);

  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return date.getTime() >= today ? isoDate : null;
}

function getLastFourDigits(number: string) {
  const digits = number.replace(/\D/gu, "");

  return digits.slice(-4) || "—";
}

export function normalizeCreditCard(
  account: CreditCardSourceAccount,
  bank: CreditCardBankDetails,
  bills: CreditCardBillSource[] = [],
  now = new Date(),
  billError: string | null = null,
): CreditCardView {
  const creditData = account.creditData;
  const openBalanceAmount = toAbsoluteAmount(account.balance) ?? 0;
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
      : openBalanceAmount;
  const availableAmount =
    reportedAvailableAmount ??
    (creditLimit !== null ? Math.max(0, creditLimit - usedAmount) : null);
  const latestClosedBill = toBillView(getLatestBill(bills));

  return {
    id: account.id,
    itemId: account.itemId,
    name: account.name.trim() || "Cartão",
    level: creditData?.level?.trim() || null,
    brand: creditData?.brand?.trim() || null,
    bankName: bank.bankName,
    bankLogoPath: bank.bankLogoPath,
    lastFourDigits: getLastFourDigits(account.number),
    openBalanceAmount,
    openDueDate: getNonExpiredDate(creditData?.balanceDueDate, now),
    latestClosedBill,
    billError,
    creditLimit,
    usedAmount,
    availableAmount,
    currencyCode: account.currencyCode,
    status: creditData?.status ?? null,
  };
}
