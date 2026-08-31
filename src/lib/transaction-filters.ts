export const transactionPeriodKeys = [
  "all",
  "last-30-days",
  "last-90-days",
  "current-month",
  "previous-month",
  "last-6-months",
  "current-year",
  "previous-year",
  "custom",
] as const;

export type TransactionPeriodKey = (typeof transactionPeriodKeys)[number];
export type TransactionTypeFilter = "all" | "CREDIT" | "DEBIT";
export type TransactionSort = "newest" | "oldest";

export type TransactionFilters = {
  period: TransactionPeriodKey;
  dateFrom: string | null;
  dateTo: string | null;
  accountId: string | null;
  type: TransactionTypeFilter;
  category: string | null;
  sort: TransactionSort;
  search: string;
  showHidden: boolean;
};

export type TransactionFilterInput = Record<
  string,
  string | string[] | undefined
>;

export type TransactionFilterTransaction = {
  id: string;
  date: string;
  accountId: string;
  type: "CREDIT" | "DEBIT";
  categoryLabel: string;
  description: string;
  bankName: string;
  accountName: string;
  excludeFromSummary: boolean;
};

export type TransactionPeriod = {
  key: TransactionPeriodKey;
  label: string;
  dateFrom: string | null;
  dateTo: string | null;
};

export const defaultTransactionFilters: TransactionFilters = {
  period: "current-month",
  dateFrom: null,
  dateTo: null,
  accountId: null,
  type: "all",
  category: null,
  sort: "newest",
  search: "",
  showHidden: false,
};

const timeZone = "America/Sao_Paulo";
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/u;

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function isPeriodKey(value: string): value is TransactionPeriodKey {
  return (transactionPeriodKeys as readonly string[]).includes(value);
}

function isDateOnly(value: string | undefined): value is string {
  if (!value || !dateOnlyPattern.test(value)) {
    return false;
  }

  const [, year, month, day] = value.match(dateOnlyPattern) ?? [];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

function getDateFromParts(year: number, month: number, day = 1) {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getDateParts(date: Date) {
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

function formatDateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12),
  );
}

function createMonth(year: number, month: number) {
  const start = getDateFromParts(year, month);
  const next = addMonths(start, 1);

  return {
    start,
    next,
    dateFrom: formatDateOnly(start),
    dateTo: formatDateOnly(next),
  };
}

function formatCustomPeriodLabel(dateFrom: string, dateTo: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  });

  return `${formatter.format(new Date(`${dateFrom}T12:00:00Z`))} – ${formatter.format(new Date(`${dateTo}T12:00:00Z`))}`;
}

export function normalizeTransactionFilters(
  input: TransactionFilterInput,
): TransactionFilters {
  const rawPeriod = getFirstValue(input.period) ?? "";
  const period = isPeriodKey(rawPeriod)
    ? rawPeriod
    : defaultTransactionFilters.period;
  const rawFrom = getFirstValue(input.from);
  const rawTo = getFirstValue(input.to);
  const hasValidCustomRange =
    isDateOnly(rawFrom) && isDateOnly(rawTo) && rawFrom <= rawTo;
  const rawAccount = getFirstValue(input.account)?.trim() ?? "";
  const rawCategory = getFirstValue(input.category)?.trim() ?? "";
  const rawSearch = getFirstValue(input.search)?.trim() ?? "";
  const rawType = getFirstValue(input.type);
  const rawSort = getFirstValue(input.sort);

  return {
    period:
      period === "custom" && !hasValidCustomRange ? "current-month" : period,
    dateFrom: period === "custom" && hasValidCustomRange ? rawFrom : null,
    dateTo: period === "custom" && hasValidCustomRange ? rawTo : null,
    accountId: rawAccount || null,
    type: rawType === "CREDIT" || rawType === "DEBIT" ? rawType : "all",
    category: rawCategory || null,
    sort: rawSort === "oldest" ? "oldest" : "newest",
    search: rawSearch,
    showHidden: getFirstValue(input.hidden) === "1",
  };
}

export function filterAndSortTransactions<
  T extends TransactionFilterTransaction,
>(transactions: readonly T[], filters: TransactionFilters) {
  const search = normalizeText(filters.search);
  const category = filters.category ? normalizeText(filters.category) : null;

  return transactions
    .filter((transaction) => {
      if (!filters.showHidden && transaction.excludeFromSummary) {
        return false;
      }

      if (filters.accountId && transaction.accountId !== filters.accountId) {
        return false;
      }

      if (filters.type !== "all" && transaction.type !== filters.type) {
        return false;
      }

      if (category && normalizeText(transaction.categoryLabel) !== category) {
        return false;
      }

      if (search) {
        const searchableText = normalizeText(
          [
            transaction.description,
            transaction.categoryLabel,
            transaction.bankName,
            transaction.accountName,
          ].join(" "),
        );

        if (!searchableText.includes(search)) {
          return false;
        }
      }

      return true;
    })
    .sort((left, right) => {
      const comparison = right.date.localeCompare(left.date);
      return filters.sort === "oldest" ? -comparison : comparison;
    });
}

export function resolveTransactionPeriod(
  period: TransactionPeriodKey,
  now = new Date(),
  customFrom?: string | null,
  customTo?: string | null,
): TransactionPeriod {
  const currentDate = getDateParts(now);
  const currentMonth = createMonth(currentDate.year, currentDate.month);

  switch (period) {
    case "all":
      return {
        key: "all",
        label: "Todo período",
        dateFrom: null,
        dateTo: null,
      };
    case "last-30-days": {
      const today = getDateFromParts(
        currentDate.year,
        currentDate.month,
        currentDate.day,
      );
      return {
        key: period,
        label: "Últimos 30 dias",
        dateFrom: formatDateOnly(addDays(today, -29)),
        dateTo: formatDateOnly(addDays(today, 1)),
      };
    }
    case "last-90-days": {
      const today = getDateFromParts(
        currentDate.year,
        currentDate.month,
        currentDate.day,
      );
      return {
        key: period,
        label: "Últimos 90 dias",
        dateFrom: formatDateOnly(addDays(today, -89)),
        dateTo: formatDateOnly(addDays(today, 1)),
      };
    }
    case "previous-month": {
      const previousMonth = createMonth(
        currentDate.year,
        currentDate.month - 1,
      );
      return {
        key: period,
        label: "Mês passado",
        dateFrom: previousMonth.dateFrom,
        dateTo: previousMonth.dateTo,
      };
    }
    case "last-6-months": {
      const start = addMonths(currentMonth.start, -5);
      return {
        key: period,
        label: "Últimos 6 meses",
        dateFrom: formatDateOnly(start),
        dateTo: currentMonth.dateTo,
      };
    }
    case "current-year": {
      const start = getDateFromParts(currentDate.year, 1);
      const nextYear = getDateFromParts(currentDate.year + 1, 1);
      return {
        key: period,
        label: "Este ano",
        dateFrom: formatDateOnly(start),
        dateTo: formatDateOnly(nextYear),
      };
    }
    case "previous-year": {
      const start = getDateFromParts(currentDate.year - 1, 1);
      const end = getDateFromParts(currentDate.year, 1);
      return {
        key: period,
        label: "Ano passado",
        dateFrom: formatDateOnly(start),
        dateTo: formatDateOnly(end),
      };
    }
    case "custom":
      if (
        customFrom &&
        customTo &&
        isDateOnly(customFrom) &&
        isDateOnly(customTo)
      ) {
        return {
          key: period,
          label: formatCustomPeriodLabel(customFrom, customTo),
          dateFrom: customFrom,
          dateTo: formatDateOnly(addDays(new Date(`${customTo}T12:00:00Z`), 1)),
        };
      }
      return resolveTransactionPeriod("current-month", now);
    default:
      return {
        key: "current-month",
        label: "Este mês",
        dateFrom: currentMonth.dateFrom,
        dateTo: currentMonth.dateTo,
      };
  }
}
