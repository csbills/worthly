export type InstallmentCreditCardMetadata = {
  installmentNumber?: number;
  totalInstallments?: number;
  totalAmount?: number | null;
  purchaseDate?: string | null;
  billId?: string | null;
  cardNumber?: string | null;
};

export type InstallmentCardBilling = {
  closingDay: number | null;
  dueDay: number | null;
};

export type InstallmentSourceTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  status?: string;
  updatedAt?: string;
  currencyCode: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  bankName: string;
  bankLogoPath: string | null;
  cardNumber: string | null;
  creditCardMetadata: InstallmentCreditCardMetadata | null;
  creditCardBilling?: InstallmentCardBilling | null;
};

export type ObservedInstallment = {
  number: number;
  amount: number;
  date: string;
  status: string;
  billId: string | null;
};

export type InstallmentView = {
  id: string;
  accountId: string;
  description: string;
  bankName: string;
  bankLogoPath: string | null;
  cardNumber: string | null;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  currencyCode: string;
  purchaseDate: string;
  firstInstallmentDate: string;
  lastInstallmentDate: string;
  latestInstallmentNumber: number;
  totalInstallments: number;
  installmentAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  status: "ACTIVE" | "COMPLETED";
  creditCardBilling: InstallmentCardBilling | null;
  observedInstallments: ObservedInstallment[];
};

export type InstallmentSummary = {
  activeCount: number;
  completedCount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  lastInstallmentDate: string | null;
  currencyCode: string;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPositiveInteger(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeDescription(description: string) {
  return description
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, " ")
    .trim();
}

function getDateKey(value: string) {
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/u)?.[0];

  if (isoDate) {
    return isoDate;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime())
    ? "sem-data"
    : parsedDate.toISOString().slice(0, 10);
}

function getPurchaseDate(transaction: InstallmentSourceTransaction) {
  return transaction.creditCardMetadata?.purchaseDate || transaction.date;
}

const INSTALLMENT_AMOUNT_VARIATION_TOLERANCE = 0.15;

function isPreferredRecord(
  current: InstallmentSourceTransaction,
  candidate: InstallmentSourceTransaction,
) {
  const statusScore = (status: string | undefined) =>
    status === "POSTED" ? 2 : status === "PENDING" ? 1 : 0;
  const currentStatusScore = statusScore(current.status);
  const candidateStatusScore = statusScore(candidate.status);

  if (candidateStatusScore !== currentStatusScore) {
    return candidateStatusScore > currentStatusScore;
  }

  return (
    (candidate.updatedAt ?? candidate.date) >
    (current.updatedAt ?? current.date)
  );
}

function addUtcMonths(value: string, months: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

function isValidDay(value: number | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 31
  );
}

function getFirstInstallmentDate(
  purchaseDate: string,
  billing: InstallmentCardBilling | null,
) {
  if (!billing || !isValidDay(billing.dueDay)) {
    return null;
  }

  const parsedPurchaseDate = new Date(purchaseDate);

  if (Number.isNaN(parsedPurchaseDate.getTime())) {
    return null;
  }

  const monthsToAdd =
    isValidDay(billing.closingDay) &&
    parsedPurchaseDate.getUTCDate() > billing.closingDay
      ? 2
      : 1;
  const firstDueMonth = new Date(
    Date.UTC(
      parsedPurchaseDate.getUTCFullYear(),
      parsedPurchaseDate.getUTCMonth() + monthsToAdd,
      1,
    ),
  );
  const lastDayOfDueMonth = new Date(
    Date.UTC(
      firstDueMonth.getUTCFullYear(),
      firstDueMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  firstDueMonth.setUTCDate(Math.min(billing.dueDay, lastDayOfDueMonth));

  return firstDueMonth.toISOString();
}

function getInstallmentGroupKey(transaction: InstallmentSourceTransaction) {
  const metadata = transaction.creditCardMetadata;
  const cardNumber = metadata?.cardNumber || transaction.cardNumber || "";

  return [
    transaction.accountId,
    cardNumber,
    normalizeDescription(transaction.description),
    getDateKey(getPurchaseDate(transaction)),
    metadata?.totalInstallments,
  ].join("\u001f");
}

function getInstallmentAmountDifference(
  left: InstallmentSourceTransaction,
  right: InstallmentSourceTransaction,
) {
  return Math.abs(
    roundCurrency(Math.abs(left.amount)) -
      roundCurrency(Math.abs(right.amount)),
  );
}

function findMatchingPurchaseGroup(
  purchaseGroups: InstallmentSourceTransaction[][],
  transaction: InstallmentSourceTransaction,
) {
  const installmentNumber = transaction.creditCardMetadata?.installmentNumber;
  let matchingGroupIndex: number | null = null;
  let smallestAmountDifference = Number.POSITIVE_INFINITY;

  for (const [groupIndex, group] of purchaseGroups.entries()) {
    const hasSameInstallmentNumber = group.some(
      (groupTransaction) =>
        groupTransaction.creditCardMetadata?.installmentNumber ===
        installmentNumber,
    );

    if (hasSameInstallmentNumber) {
      continue;
    }

    const amountDifference = Math.min(
      ...group.map((groupTransaction) =>
        getInstallmentAmountDifference(groupTransaction, transaction),
      ),
    );

    if (
      amountDifference <= INSTALLMENT_AMOUNT_VARIATION_TOLERANCE &&
      amountDifference < smallestAmountDifference
    ) {
      matchingGroupIndex = groupIndex;
      smallestAmountDifference = amountDifference;
    }
  }

  return matchingGroupIndex;
}

function getValidInstallmentMetadata(
  transaction: InstallmentSourceTransaction,
) {
  const metadata = transaction.creditCardMetadata;

  if (
    transaction.type !== "DEBIT" ||
    !metadata ||
    !isPositiveInteger(metadata.installmentNumber) ||
    !isPositiveInteger(metadata.totalInstallments) ||
    metadata.totalInstallments <= 1 ||
    metadata.installmentNumber > metadata.totalInstallments ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount === 0
  ) {
    return null;
  }

  return metadata;
}

export function buildInstallments(
  transactions: readonly InstallmentSourceTransaction[],
): InstallmentView[] {
  const groupedTransactions = new Map<
    string,
    InstallmentSourceTransaction[][]
  >();

  for (const transaction of transactions) {
    if (!getValidInstallmentMetadata(transaction)) {
      continue;
    }

    const groupKey = getInstallmentGroupKey(transaction);
    const purchaseGroups = groupedTransactions.get(groupKey) ?? [];
    const matchingGroupIndex = findMatchingPurchaseGroup(
      purchaseGroups,
      transaction,
    );

    if (matchingGroupIndex === null) {
      purchaseGroups.push([transaction]);
    } else {
      purchaseGroups[matchingGroupIndex]?.push(transaction);
    }

    groupedTransactions.set(groupKey, purchaseGroups);
  }

  return [...groupedTransactions.entries()]
    .flatMap(([groupKey, purchaseGroups]) =>
      purchaseGroups.map((transactionsInGroup) => {
        const recordsByNumber = new Map<number, InstallmentSourceTransaction>();

        for (const transaction of transactionsInGroup) {
          const installmentNumber =
            transaction.creditCardMetadata?.installmentNumber;

          if (!installmentNumber) {
            continue;
          }

          const currentRecord = recordsByNumber.get(installmentNumber);

          if (!currentRecord || isPreferredRecord(currentRecord, transaction)) {
            recordsByNumber.set(installmentNumber, transaction);
          }
        }

        const records = [...recordsByNumber.entries()].sort(
          ([leftNumber], [rightNumber]) => leftNumber - rightNumber,
        );
        const firstTransaction = transactionsInGroup[0];
        const lastTransaction = records.at(-1)?.[1] ?? firstTransaction;
        const metadata = lastTransaction.creditCardMetadata;
        const totalInstallments = metadata?.totalInstallments ?? 0;
        const latestInstallmentNumber = records.at(-1)?.[0] ?? 0;
        const installmentAmount = roundCurrency(
          Math.abs(lastTransaction.amount),
        );
        const metadataTotalAmount = Math.abs(metadata?.totalAmount ?? 0);
        const totalAmount = roundCurrency(
          metadataTotalAmount > 0
            ? metadataTotalAmount
            : installmentAmount * totalInstallments,
        );
        const paidAmount = roundCurrency(
          Math.min(totalAmount, installmentAmount * latestInstallmentNumber),
        );
        const remainingAmount = roundCurrency(totalAmount - paidAmount);
        const progressPercentage =
          totalInstallments > 0
            ? roundCurrency((latestInstallmentNumber / totalInstallments) * 100)
            : 0;
        const purchaseDate = transactionsInGroup.map(getPurchaseDate).sort()[0];
        const creditCardBilling =
          transactionsInGroup.find(
            (transaction) => transaction.creditCardBilling,
          )?.creditCardBilling ?? null;
        const firstInstallmentDate =
          getFirstInstallmentDate(purchaseDate, creditCardBilling) ??
          purchaseDate;
        const lastInstallmentDate = addUtcMonths(
          firstInstallmentDate,
          Math.max(totalInstallments - 1, 0),
        );
        const cardNumber =
          metadata?.cardNumber ||
          lastTransaction.cardNumber ||
          firstTransaction.cardNumber;

        return {
          id: `installment-${encodeURIComponent(groupKey)}-${encodeURIComponent(firstTransaction.id)}`,
          accountId: firstTransaction.accountId,
          description:
            firstTransaction.description.trim() || "Compra parcelada",
          bankName: firstTransaction.bankName,
          bankLogoPath: firstTransaction.bankLogoPath,
          cardNumber,
          categoryLabel: firstTransaction.categoryLabel,
          categoryIcon: firstTransaction.categoryIcon,
          categoryColor: firstTransaction.categoryColor,
          currencyCode: firstTransaction.currencyCode,
          purchaseDate,
          firstInstallmentDate,
          lastInstallmentDate,
          latestInstallmentNumber,
          totalInstallments,
          installmentAmount,
          totalAmount,
          paidAmount,
          remainingAmount,
          progressPercentage,
          status:
            latestInstallmentNumber >= totalInstallments
              ? ("COMPLETED" as const)
              : ("ACTIVE" as const),
          creditCardBilling,
          observedInstallments: records.map(([, transaction]) => ({
            number: transaction.creditCardMetadata?.installmentNumber ?? 0,
            amount: roundCurrency(Math.abs(transaction.amount)),
            date: transaction.date,
            status: transaction.status ?? "POSTED",
            billId: transaction.creditCardMetadata?.billId ?? null,
          })),
        } satisfies InstallmentView;
      }),
    )
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "ACTIVE" ? -1 : 1;
      }

      return right.remainingAmount - left.remainingAmount;
    });
}

export function summarizeInstallments(
  installments: readonly InstallmentView[],
): InstallmentSummary {
  const activeInstallments = installments.filter(
    (installment) => installment.status === "ACTIVE",
  );
  const totalAmount = roundCurrency(
    activeInstallments.reduce(
      (total, installment) => total + installment.totalAmount,
      0,
    ),
  );
  const paidAmount = roundCurrency(
    activeInstallments.reduce(
      (total, installment) => total + installment.paidAmount,
      0,
    ),
  );
  const remainingAmount = roundCurrency(totalAmount - paidAmount);
  const lastInstallmentDate = activeInstallments.reduce<string | null>(
    (latestDate, installment) =>
      !latestDate || installment.lastInstallmentDate > latestDate
        ? installment.lastInstallmentDate
        : latestDate,
    null,
  );

  return {
    activeCount: activeInstallments.length,
    completedCount: installments.length - activeInstallments.length,
    totalAmount,
    paidAmount,
    remainingAmount,
    progressPercentage:
      totalAmount > 0 ? roundCurrency((paidAmount / totalAmount) * 100) : 0,
    lastInstallmentDate,
    currencyCode:
      activeInstallments[0]?.currencyCode ??
      installments[0]?.currencyCode ??
      "BRL",
  };
}
