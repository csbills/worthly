import type { Account, Transaction } from "pluggy-sdk";

import { isNonSpendingTransaction } from "./transaction-spending-rules";

const timeZone = "America/Sao_Paulo";
const transferCategoryPrefixes = ["04", "05"];
const transferSignalPattern =
  /(?:\btransfer\w*\b|\bpix\b|\bted\b|\bdoc\b|\btef\b|\btrf\b|\bwire\b)/u;

type ReportingAccountContext = {
  accountType?: Account["type"];
  accountSubtype?: Account["subtype"];
  accountNumber?: Account["number"];
};

export type ReportingTransaction = Pick<
  Transaction,
  | "id"
  | "accountId"
  | "type"
  | "amount"
  | "date"
  | "currencyCode"
  | "category"
  | "categoryId"
  | "operationType"
  | "description"
  | "descriptionRaw"
  | "paymentData"
> &
  ReportingAccountContext;

type TransferCandidate = {
  id: string;
  accountId: string;
  transferSignal: boolean;
};

type TransactionBucket = {
  debits: TransferCandidate[];
  credits: TransferCandidate[];
};

function normalizeText(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim() ?? ""
  );
}

function hasTransferSignal(transaction: ReportingTransaction) {
  const categoryId = transaction.categoryId?.trim() ?? "";

  if (
    transferCategoryPrefixes.some((prefix) => categoryId.startsWith(prefix))
  ) {
    return true;
  }

  const searchableText = [
    transaction.category,
    transaction.operationType,
    transaction.description,
    transaction.descriptionRaw,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  return transferSignalPattern.test(searchableText);
}

function normalizeDocument(value: string | null | undefined) {
  return value?.replace(/\D/gu, "") ?? "";
}

function normalizeAccountNumber(value: string | null | undefined) {
  return normalizeDocument(value).replace(/^0+/u, "");
}

function getNormalizedAccountNumbers(
  accountNumbers: readonly (string | null | undefined)[],
) {
  return new Set(accountNumbers.map(normalizeAccountNumber).filter(Boolean));
}

export function getConnectedAccountNumbers(
  accounts: readonly Pick<Account, "number">[],
) {
  return getNormalizedAccountNumbers(accounts.map((account) => account.number));
}

function hasConnectedAccountReference(
  transaction: ReportingTransaction,
  knownAccountNumbers: ReadonlySet<string>,
) {
  const accountNumber = normalizeAccountNumber(transaction.accountNumber);

  if (!accountNumber) {
    return false;
  }

  const participantAccountNumbers = [
    transaction.paymentData?.payer?.accountNumber,
    transaction.paymentData?.receiver?.accountNumber,
  ].map(normalizeAccountNumber);

  return participantAccountNumbers.some(
    (participantAccountNumber) =>
      participantAccountNumber.length > 0 &&
      participantAccountNumber !== accountNumber &&
      knownAccountNumbers.has(participantAccountNumber),
  );
}

function isExternalSameOwnerCredit(
  transaction: ReportingTransaction,
  connectedAccountNumbers: ReadonlySet<string>,
) {
  if (transaction.type !== "CREDIT" || !hasSameOwnerParticipants(transaction)) {
    return false;
  }

  const payerAccountNumber = normalizeAccountNumber(
    transaction.paymentData?.payer?.accountNumber,
  );

  return (
    payerAccountNumber.length > 0 &&
    !connectedAccountNumbers.has(payerAccountNumber)
  );
}

function hasSameOwnerParticipants(transaction: ReportingTransaction) {
  const payerDocument = normalizeDocument(
    transaction.paymentData?.payer?.documentNumber?.value,
  );
  const receiverDocument = normalizeDocument(
    transaction.paymentData?.receiver?.documentNumber?.value,
  );

  return (
    payerDocument.length > 0 &&
    receiverDocument.length > 0 &&
    payerDocument === receiverDocument
  );
}

function hasInvestmentSignal(transaction: ReportingTransaction) {
  const searchableText = [
    transaction.category,
    transaction.operationType,
    transaction.description,
    transaction.descriptionRaw,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  return /(?:investimento(?:s)?|investment(?:s)?|resgate\s+rdb|aplicacao\s+rdb)/u.test(
    searchableText,
  );
}

function isCreditCardSettlement(transaction: ReportingTransaction) {
  if (transaction.categoryId?.trim() === "05100000") {
    return true;
  }

  const isCreditCard =
    transaction.accountType === "CREDIT" ||
    transaction.accountSubtype === "CREDIT_CARD";

  if (isCreditCard && transaction.type === "CREDIT" && transaction.amount < 0) {
    return true;
  }

  const searchableText = [
    transaction.category,
    transaction.operationType,
    transaction.description,
    transaction.descriptionRaw,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  return /(?:pagamento.*(?:fatura|cartao)|(?:fatura|cartao).*pagamento|credit card payment|bill payment)/u.test(
    searchableText,
  );
}

function getLocalDateKey(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getBucketKey(transaction: ReportingTransaction) {
  const dateKey = getLocalDateKey(transaction.date);
  const amount = Math.abs(transaction.amount);

  if (!dateKey || !Number.isFinite(amount)) {
    return null;
  }

  const amountInCents = Math.round(amount * 100);
  const currencyCode =
    transaction.currencyCode?.trim().toUpperCase() ?? "UNKNOWN";

  return `${dateKey}|${currencyCode}|${amountInCents}`;
}

function matchCandidates(
  debits: TransferCandidate[],
  credits: TransferCandidate[],
  matchedDebitIds: Set<string>,
  matchedCreditIds: Set<string>,
  internalTransferIds: Set<string>,
) {
  for (const debit of debits) {
    if (matchedDebitIds.has(debit.id)) {
      continue;
    }

    const credit = credits.find(
      (candidate) =>
        !matchedCreditIds.has(candidate.id) &&
        candidate.accountId !== debit.accountId &&
        debit.transferSignal &&
        candidate.transferSignal,
    );

    if (!credit) {
      continue;
    }

    matchedDebitIds.add(debit.id);
    matchedCreditIds.add(credit.id);
    internalTransferIds.add(debit.id);
    internalTransferIds.add(credit.id);
  }
}

export function getInternalTransferTransactionIds(
  transactions: readonly ReportingTransaction[],
): Set<string> {
  const buckets = new Map<string, TransactionBucket>();
  const knownAccountNumbers = getNormalizedAccountNumbers(
    transactions.map((transaction) => transaction.accountNumber),
  );
  const internalTransferIds = new Set<string>();
  const matchedDebitIds = new Set<string>();
  const matchedCreditIds = new Set<string>();

  for (const transaction of transactions) {
    if (!transaction.id || !transaction.accountId) {
      continue;
    }

    if (hasConnectedAccountReference(transaction, knownAccountNumbers)) {
      internalTransferIds.add(transaction.id);

      if (transaction.type === "DEBIT") {
        matchedDebitIds.add(transaction.id);
      } else if (transaction.type === "CREDIT") {
        matchedCreditIds.add(transaction.id);
      }
    }

    const bucketKey = getBucketKey(transaction);

    if (!bucketKey) {
      continue;
    }

    const bucket = buckets.get(bucketKey) ?? { debits: [], credits: [] };
    const candidate = {
      id: transaction.id,
      accountId: transaction.accountId,
      transferSignal: hasTransferSignal(transaction),
    };

    if (transaction.type === "DEBIT") {
      bucket.debits.push(candidate);
    } else if (transaction.type === "CREDIT") {
      bucket.credits.push(candidate);
    }

    buckets.set(bucketKey, bucket);
  }

  for (const { debits, credits } of buckets.values()) {
    matchCandidates(
      debits,
      credits,
      matchedDebitIds,
      matchedCreditIds,
      internalTransferIds,
    );
  }

  return internalTransferIds;
}

export function withReportingAccountContext(
  transaction: Transaction,
  account: Pick<Account, "type" | "subtype" | "number">,
): ReportingTransaction {
  return {
    ...transaction,
    accountType: account.type,
    accountSubtype: account.subtype,
    accountNumber: account.number,
  };
}

export function isExcludedFromFinancialReporting(
  transaction: ReportingTransaction,
  internalTransferIds: ReadonlySet<string>,
  connectedAccountNumbers: ReadonlySet<string> = new Set(),
) {
  const externalSameOwnerCredit = isExternalSameOwnerCredit(
    transaction,
    connectedAccountNumbers,
  );

  return (
    internalTransferIds.has(transaction.id) ||
    isCreditCardSettlement(transaction) ||
    (hasSameOwnerParticipants(transaction) && !externalSameOwnerCredit) ||
    hasInvestmentSignal(transaction) ||
    isNonSpendingTransaction(transaction)
  );
}
