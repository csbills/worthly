import type { Account, CreditCardBills, Transaction } from "pluggy-sdk";

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

export type CreditCardTransactionSource = Pick<
  Transaction,
  "id" | "date" | "type" | "amount" | "creditCardMetadata"
>;

export type CreditCardForecastView = {
  amount: number;
  transactionCount: number;
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
  nextBillInProgress: CreditCardForecastView | null;
  billError: string | null;
  nextBillError: string | null;
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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getDateKey(value: Date | string | null | undefined) {
  return toIsoDate(value)?.slice(0, 10) ?? null;
}

function addUtcMonths(value: string, months: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = date.getUTCDate();
  const result = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDayOfMonth));

  return result.toISOString();
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

function getNextCycleDate(
  value: string,
  now: Date,
  minimumMonthsToAdd: number,
) {
  const todayKey = getDateKey(now);
  let monthsToAdd = minimumMonthsToAdd;
  let date = addUtcMonths(value, monthsToAdd);

  if (!date) {
    return null;
  }

  let dateKey = getDateKey(date);

  while (todayKey && dateKey && dateKey <= todayKey) {
    monthsToAdd += 1;
    date = addUtcMonths(value, monthsToAdd);

    if (!date || monthsToAdd > 120) {
      return null;
    }

    dateKey = getDateKey(date);
  }

  return { date, monthsToAdd };
}

function getNextBillingCycle(
  account: Pick<CreditCardSourceAccount, "creditData">,
  latestClosedBill: CreditCardBillView | null,
  now: Date,
) {
  const latestClosingDate = latestClosedBill?.closingDate;
  const accountClosingDate = toIsoDate(account.creditData?.balanceCloseDate);
  const closingDate = latestClosingDate ?? accountClosingDate;

  if (!closingDate) {
    return null;
  }

  const nextCycle = getNextCycleDate(
    closingDate,
    now,
    latestClosingDate ? 1 : 0,
  );
  const previousClosingDate = nextCycle
    ? addUtcMonths(closingDate, nextCycle.monthsToAdd - 1)
    : null;

  if (!nextCycle || !previousClosingDate) {
    return null;
  }

  const dueDateSource =
    latestClosedBill?.dueDate ?? toIsoDate(account.creditData?.balanceDueDate);
  const dueDate = dueDateSource
    ? addUtcMonths(dueDateSource, nextCycle.monthsToAdd)
    : null;

  return {
    previousClosingDate,
    nextClosingDate: nextCycle.date,
    dueDate,
  };
}

export function calculateNextBillInProgress(
  account: Pick<CreditCardSourceAccount, "creditData">,
  latestClosedBill: CreditCardBillView | null,
  transactions: readonly CreditCardTransactionSource[] = [],
  now = new Date(),
): CreditCardForecastView | null {
  const billingCycle = getNextBillingCycle(account, latestClosedBill, now);
  const todayKey = getDateKey(now);
  const previousClosingDateKey = getDateKey(billingCycle?.previousClosingDate);
  const nextClosingDateKey = getDateKey(billingCycle?.nextClosingDate);

  if (!billingCycle || !previousClosingDateKey || !nextClosingDateKey) {
    return null;
  }

  const nextBillTransactions = transactions.filter((transaction) => {
    if (
      transaction.type !== "DEBIT" ||
      !Number.isFinite(transaction.amount) ||
      transaction.amount === 0
    ) {
      return false;
    }

    const transactionDateKey = getDateKey(transaction.date);

    return (
      transactionDateKey !== null &&
      transactionDateKey > previousClosingDateKey &&
      transactionDateKey <= nextClosingDateKey &&
      (todayKey === null || transactionDateKey <= todayKey)
    );
  });

  if (nextBillTransactions.length === 0) {
    return null;
  }

  return {
    amount: roundCurrency(
      nextBillTransactions.reduce(
        (total, transaction) => total + Math.abs(transaction.amount),
        0,
      ),
    ),
    transactionCount: nextBillTransactions.length,
    closingDate: billingCycle.nextClosingDate,
    dueDate: billingCycle.dueDate,
  };
}

export function normalizeCreditCard(
  account: CreditCardSourceAccount,
  bank: CreditCardBankDetails,
  bills: CreditCardBillSource[] = [],
  now = new Date(),
  billError: string | null = null,
  transactions: readonly CreditCardTransactionSource[] = [],
  nextBillError: string | null = null,
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
  const nextBillInProgress = calculateNextBillInProgress(
    account,
    latestClosedBill,
    transactions,
    now,
  );

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
    nextBillInProgress,
    billError,
    nextBillError,
    creditLimit,
    usedAmount,
    availableAmount,
    currencyCode: account.currencyCode,
    status: creditData?.status ?? null,
  };
}
