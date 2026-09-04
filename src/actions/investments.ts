"use server";

import type {
  CurrencyCode,
  Investment,
  InvestmentSubtype,
  InvestmentType,
} from "pluggy-sdk";

import { getPluggyClient } from "@/lib/pluggy";
import { prisma } from "@/lib/prisma";

const investmentPageSize = 500;

const investmentCategoryLabels: Record<InvestmentType, string> = {
  COE: "COE",
  EQUITY: "Renda variável",
  ETF: "ETFs",
  FIXED_INCOME: "Renda fixa",
  MUTUAL_FUND: "Fundos",
  OTHER: "Outros",
  SECURITY: "Previdência",
};

const investmentCategoryOrder: InvestmentType[] = [
  "FIXED_INCOME",
  "MUTUAL_FUND",
  "EQUITY",
  "ETF",
  "SECURITY",
  "COE",
  "OTHER",
];

export type SerializedInvestment = {
  id: string;
  itemId: string;
  name: string;
  type: InvestmentType;
  subtype: InvestmentSubtype | null;
  currencyCode: CurrencyCode;
  balance: number;
  positionCount: number;
  hasMultipleDueDates: boolean;
  hasMultipleRates: boolean;
  amount: number | null;
  amountWithdrawal: number | null;
  amountProfit: number | null;
  amountOriginal: number | null;
  income: number | null;
  quantity: number | null;
  value: number | null;
  rate: number | null;
  rateType: string | null;
  fixedAnnualRate: number | null;
  annualRate: number | null;
  lastTwelveMonthsRate: number | null;
  date: string | null;
  dueDate: string | null;
  institutionName: string | null;
  issuer: string | null;
};

export type InvestmentCategorySummary = {
  key: InvestmentType;
  label: string;
  count: number;
  lots: number;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  income: number | null;
};

export type InvestmentCurrencySummary = {
  currencyCode: CurrencyCode;
  lots: number;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  income: number | null;
  categories: InvestmentCategorySummary[];
};

export type InvestmentsResult = {
  itemCount: number;
  investments: SerializedInvestment[];
  currencies: InvestmentCurrencySummary[];
  error: string | null;
};

function serializeDate(date: Date | null | undefined) {
  return date?.toISOString() ?? null;
}

type InvestmentTransactionRecord = {
  type: string | null;
  amount: number | null;
  netAmount: number | null;
};

function getTransactionAmount(transaction: InvestmentTransactionRecord) {
  const amount = transaction.netAmount ?? transaction.amount;

  return typeof amount === "number" && Number.isFinite(amount)
    ? Math.abs(amount)
    : null;
}

function sumTransactionAmounts(
  transactions: InvestmentTransactionRecord[],
  type: string,
) {
  let total = 0;
  let hasValue = false;

  for (const transaction of transactions) {
    if (transaction.type !== type) {
      continue;
    }

    const amount = getTransactionAmount(transaction);

    if (amount === null) {
      continue;
    }

    total += amount;
    hasValue = true;
  }

  return hasValue ? total : null;
}

function getInvestmentPerformance(
  investment: Investment,
  transactions: InvestmentTransactionRecord[] | null,
) {
  const income =
    transactions === null
      ? null
      : (sumTransactionAmounts(transactions, "INTEREST") ?? 0);
  const bought =
    transactions === null ? null : sumTransactionAmounts(transactions, "BUY");
  const sold =
    transactions === null
      ? null
      : (sumTransactionAmounts(transactions, "SELL") ?? 0);
  const amortized =
    transactions === null
      ? null
      : (sumTransactionAmounts(transactions, "AMORTIZATION") ?? 0);
  const taxes =
    transactions === null
      ? null
      : (sumTransactionAmounts(transactions, "TAX") ?? 0);
  const amountOriginal = investment.amountOriginal ?? bought;

  if (investment.amountProfit !== null) {
    return {
      amountOriginal,
      amountProfit: investment.amountProfit,
      income,
    };
  }

  if (transactions !== null && bought !== null) {
    return {
      amountOriginal,
      amountProfit:
        investment.balance +
        (sold ?? 0) +
        (income ?? 0) +
        (amortized ?? 0) -
        bought -
        (taxes ?? 0),
      income,
    };
  }

  return {
    amountOriginal,
    amountProfit:
      amountOriginal === null ? null : investment.balance - amountOriginal,
    income,
  };
}

function serializeInvestment(
  investment: Investment,
  transactions: InvestmentTransactionRecord[] | null = null,
): SerializedInvestment {
  const performance = getInvestmentPerformance(investment, transactions);

  return {
    id: investment.id,
    itemId: investment.itemId,
    name: investment.name,
    type: investment.type,
    subtype: investment.subtype ?? null,
    currencyCode: investment.currencyCode,
    balance: investment.balance,
    positionCount: 1,
    hasMultipleDueDates: false,
    hasMultipleRates: false,
    amount: investment.amount ?? null,
    amountWithdrawal: investment.amountWithdrawal ?? null,
    amountProfit: performance.amountProfit,
    amountOriginal: performance.amountOriginal,
    income: performance.income,
    quantity: investment.quantity ?? null,
    value: investment.value ?? null,
    rate: investment.rate ?? null,
    rateType: investment.rateType ?? null,
    fixedAnnualRate: investment.fixedAnnualRate ?? null,
    annualRate: investment.annualRate ?? null,
    lastTwelveMonthsRate: investment.lastTwelveMonthsRate ?? null,
    date: serializeDate(investment.date),
    dueDate: serializeDate(investment.dueDate),
    institutionName: investment.institution?.name ?? null,
    issuer: investment.issuer ?? null,
  };
}

async function fetchInvestmentTransactions(
  client: ReturnType<typeof getPluggyClient>,
  investment: Investment,
) {
  if (investment.balance <= 0) {
    return null;
  }

  try {
    return (await client.fetchAllInvestmentTransactions(
      investment.id,
    )) as InvestmentTransactionRecord[];
  } catch {
    return null;
  }
}

async function fetchAllInvestments(
  client: ReturnType<typeof getPluggyClient>,
  itemId: string,
) {
  const investments: Investment[] = [];
  let page = 1;

  while (true) {
    const response = await client.fetchInvestments(itemId, undefined, {
      page,
      pageSize: investmentPageSize,
    });
    investments.push(...response.results);

    if (page >= response.totalPages || response.results.length === 0) {
      return investments;
    }

    page += 1;
  }
}

function addNullableValue(total: number | null, value: number | null) {
  if (value === null) {
    return total;
  }

  return (total ?? 0) + value;
}

function normalizeIdentity(value: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

function getConsolidationKey(investment: SerializedInvestment) {
  const issuerOrName =
    normalizeIdentity(investment.issuer) || normalizeIdentity(investment.name);

  return [
    investment.currencyCode,
    investment.type,
    investment.subtype ?? "",
    normalizeIdentity(investment.institutionName),
    issuerOrName,
  ].join("|");
}

function consolidateInvestments(
  investments: SerializedInvestment[],
): SerializedInvestment[] {
  const groups = new Map<string, SerializedInvestment>();

  for (const investment of investments) {
    const key = getConsolidationKey(investment);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, { ...investment });
      continue;
    }

    current.positionCount += investment.positionCount;
    current.balance += investment.balance;
    current.amount = addNullableValue(current.amount, investment.amount);
    current.amountWithdrawal = addNullableValue(
      current.amountWithdrawal,
      investment.amountWithdrawal,
    );
    current.amountProfit = addNullableValue(
      current.amountProfit,
      investment.amountProfit,
    );
    current.amountOriginal = addNullableValue(
      current.amountOriginal,
      investment.amountOriginal,
    );
    current.income = addNullableValue(current.income, investment.income);
    current.quantity = addNullableValue(current.quantity, investment.quantity);

    if (
      investment.date &&
      (current.date === null || investment.date > current.date)
    ) {
      current.date = investment.date;
    }

    if (!current.hasMultipleDueDates) {
      if (current.dueDate !== investment.dueDate) {
        current.hasMultipleDueDates = true;
        current.dueDate = null;
      }
    }

    if (!current.hasMultipleRates) {
      const hasSameRate =
        current.rate === investment.rate &&
        current.rateType === investment.rateType &&
        current.fixedAnnualRate === investment.fixedAnnualRate &&
        current.annualRate === investment.annualRate &&
        current.lastTwelveMonthsRate === investment.lastTwelveMonthsRate;

      if (!hasSameRate) {
        current.hasMultipleRates = true;
        current.rate = null;
        current.rateType = null;
        current.fixedAnnualRate = null;
        current.annualRate = null;
        current.lastTwelveMonthsRate = null;
      }
    }

    if (current.value !== investment.value) {
      current.value = null;
    }
  }

  return [...groups.values()];
}

function summarizeInvestments(
  investments: SerializedInvestment[],
): InvestmentCurrencySummary[] {
  const currencies = new Map<
    CurrencyCode,
    {
      lots: number;
      balance: number;
      amountOriginal: number | null;
      amountProfit: number | null;
      income: number | null;
      categories: Map<InvestmentType, InvestmentCategorySummary>;
    }
  >();

  for (const investment of investments) {
    let currency = currencies.get(investment.currencyCode);

    if (!currency) {
      currency = {
        lots: 0,
        balance: 0,
        amountOriginal: null,
        amountProfit: null,
        income: null,
        categories: new Map(),
      };
      currencies.set(investment.currencyCode, currency);
    }

    currency.lots += investment.positionCount;
    currency.balance += investment.balance;
    currency.amountOriginal = addNullableValue(
      currency.amountOriginal,
      investment.amountOriginal,
    );
    currency.amountProfit = addNullableValue(
      currency.amountProfit,
      investment.amountProfit,
    );
    currency.income = addNullableValue(currency.income, investment.income);

    let category = currency.categories.get(investment.type);

    if (!category) {
      category = {
        key: investment.type,
        label: investmentCategoryLabels[investment.type],
        count: 0,
        lots: 0,
        balance: 0,
        amountOriginal: null,
        amountProfit: null,
        income: null,
      };
      currency.categories.set(investment.type, category);
    }

    category.count += 1;
    category.lots += investment.positionCount;
    category.balance += investment.balance;
    category.amountOriginal = addNullableValue(
      category.amountOriginal,
      investment.amountOriginal,
    );
    category.amountProfit = addNullableValue(
      category.amountProfit,
      investment.amountProfit,
    );
    category.income = addNullableValue(category.income, investment.income);
  }

  return [...currencies.entries()]
    .sort(([left], [right]) => {
      if (left === "BRL") return -1;
      if (right === "BRL") return 1;
      return left.localeCompare(right);
    })
    .map(([currencyCode, summary]) => ({
      currencyCode,
      lots: summary.lots,
      balance: summary.balance,
      amountOriginal: summary.amountOriginal,
      amountProfit: summary.amountProfit,
      income: summary.income,
      categories: [...summary.categories.values()].sort(
        (left, right) =>
          investmentCategoryOrder.indexOf(left.key) -
          investmentCategoryOrder.indexOf(right.key),
      ),
    }));
}

export async function getInvestments(): Promise<InvestmentsResult> {
  const items = await prisma.pluggyItem.findMany({
    select: { itemId: true },
    orderBy: { createdAt: "asc" },
  });

  if (items.length === 0) {
    return {
      itemCount: 0,
      investments: [],
      currencies: [],
      error: null,
    };
  }

  try {
    const client = getPluggyClient();
    const investmentResults = await Promise.allSettled(
      items.map(({ itemId }) => fetchAllInvestments(client, itemId)),
    );
    const fetchedInvestments = investmentResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const serializedInvestments = await Promise.all(
      fetchedInvestments.map(async (investment) =>
        serializeInvestment(
          investment,
          await fetchInvestmentTransactions(client, investment),
        ),
      ),
    );
    const investments = consolidateInvestments(serializedInvestments).sort(
      (left, right) =>
        right.balance - left.balance || left.name.localeCompare(right.name),
    );
    const hasError = investmentResults.some(
      (result) => result.status === "rejected",
    );

    return {
      itemCount: items.length,
      investments,
      currencies: summarizeInvestments(investments),
      error: hasError
        ? "Não foi possível carregar uma ou mais conexões. Verifique o status no Meu Pluggy."
        : null,
    };
  } catch {
    return {
      itemCount: items.length,
      investments: [],
      currencies: [],
      error: "Não foi possível autenticar ou consultar a Pluggy.",
    };
  }
}
