/**
 * Raio-X financeiro da casa: quanto entra e sai num mês típico, o que é
 * essencial e o que é escolha, quanto sobra e quem traz e gasta o quê.
 * Módulo puro — recebe transações já serializadas e o dono de cada conta.
 *
 * "Típico" é a mediana dos meses fechados, não a média: uma geladeira à vista
 * ou um bônus não devem mudar o plano do mês a mês.
 */

import { getTransactionCategory } from "@/lib/transaction-category-dictionary";

export type BaselineTransaction = {
  date: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  accountId: string;
  categoryId: string | null;
  excludeFromSummary: boolean;
};

export type BaselineMember = { id: string; name: string };

export type BaselineMonth = {
  key: string;
  income: number;
  expenses: number;
  essential: number;
  discretionary: number;
};

export type BaselineGroup = {
  groupId: string;
  label: string;
  icon: string;
  essential: boolean;
  monthlyTypical: number;
  lastMonth: number;
};

export type BaselineMemberSummary = {
  memberId: string | null;
  name: string;
  typicalIncome: number;
  typicalExpenses: number;
};

export type FinancialBaseline = {
  monthsAnalyzed: number;
  confidence: "low" | "medium" | "high";
  months: BaselineMonth[];
  typicalIncome: number;
  typicalExpenses: number;
  typicalEssential: number;
  typicalDiscretionary: number;
  averageIncome: number;
  averageExpenses: number;
  /** Renda típica menos gasto típico. Pode ser negativa. */
  savingsCapacity: number;
  savingsRate: number;
  /** Quanto a renda varia entre o pior e o melhor mês, sobre a típica. */
  incomeVariation: number;
  groups: BaselineGroup[];
  members: BaselineMemberSummary[];
  debt: {
    /** Parcelas de financiamentos (imóvel, carro, estudo) por mês típico. */
    financingMonthly: number;
    loansMonthly: number;
    /** Juros, multas e cheque especial pagos no período inteiro. */
    interestAndFees: number;
    /** Pagou juros ou cheque especial em mais de um mês: dívida cara. */
    hasExpensiveDebt: boolean;
  };
};

/** Grupos que mantêm a casa de pé; o resto é escolha. */
const essentialGroups = new Set([
  "02000000", // Empréstimos e financiamento
  "06000000", // Obrigações legais
  "07000000", // Serviços (luz, água, internet…)
  "10000000", // Supermercado
  "15000000", // Impostos
  "16000000", // Taxas bancárias
  "17000000", // Moradia
  "18000000", // Saúde
  "19000000", // Transporte
  "20000000", // Seguros
]);

const financingIds = new Set(["02030000", "02030001", "02030002", "02030003"]);
const expensiveDebtIds = new Set(["02010000", "02020000"]);

export const unassignedMemberName = "Sem dono definido";

function median(values: readonly number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

const round = (value: number) => Math.round(value * 100) / 100;
const pad = (value: number) => value.toString().padStart(2, "0");

/** Meses fechados anteriores a `now`, do mais antigo para o mais recente. */
export function completedMonthKeys(now: Date, count: number) {
  const keys: string[] = [];
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "numeric",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  let year = Number(parts.year);
  let month = Number(parts.month);

  for (let index = 0; index < count; index += 1) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    keys.unshift(`${year}-${pad(month)}`);
  }

  return keys;
}

function monthKeyOf(isoDate: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(new Date(isoDate))
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}`;
}

export function buildFinancialBaseline({
  transactions,
  accountOwners,
  now,
  monthCount = 6,
}: {
  transactions: readonly BaselineTransaction[];
  /** accountId → pessoa. Contas sem dono vão para "Sem dono definido". */
  accountOwners: ReadonlyMap<string, BaselineMember>;
  now: Date;
  monthCount?: number;
}): FinancialBaseline {
  const keys = completedMonthKeys(now, monthCount);
  const keySet = new Set(keys);
  const monthTotals = new Map<string, BaselineMonth>();
  const groupTotals = new Map<string, Map<string, number>>();
  const memberTotals = new Map<
    string,
    {
      member: BaselineMember | null;
      income: Map<string, number>;
      expenses: Map<string, number>;
    }
  >();
  const monthsWithExpensiveDebt = new Set<string>();
  const financing = new Map<string, number>();
  const loans = new Map<string, number>();
  let interestAndFees = 0;

  const add = (map: Map<string, number>, key: string, value: number) =>
    map.set(key, (map.get(key) ?? 0) + value);

  for (const transaction of transactions) {
    if (
      transaction.excludeFromSummary ||
      !Number.isFinite(transaction.amount)
    ) {
      continue;
    }
    const key = monthKeyOf(transaction.date);
    if (!keySet.has(key)) continue;

    const amount = Math.abs(transaction.amount);
    const category = getTransactionCategory(transaction.categoryId, null);
    const month = monthTotals.get(key) ?? {
      key,
      income: 0,
      expenses: 0,
      essential: 0,
      discretionary: 0,
    };
    monthTotals.set(key, month);

    const owner = accountOwners.get(transaction.accountId) ?? null;
    const ownerKey = owner?.id ?? "";
    const ownerTotals = memberTotals.get(ownerKey) ?? {
      member: owner,
      income: new Map(),
      expenses: new Map(),
    };
    memberTotals.set(ownerKey, ownerTotals);

    if (transaction.type === "CREDIT") {
      month.income += amount;
      add(ownerTotals.income, key, amount);
      continue;
    }

    month.expenses += amount;
    add(ownerTotals.expenses, key, amount);
    if (essentialGroups.has(category.groupId)) month.essential += amount;
    else month.discretionary += amount;

    const byMonth = groupTotals.get(category.groupId) ?? new Map();
    add(byMonth, key, amount);
    groupTotals.set(category.groupId, byMonth);

    if (financingIds.has(category.id)) add(financing, key, amount);
    if (category.id === "02040000") add(loans, key, amount);
    if (expensiveDebtIds.has(category.id)) {
      interestAndFees += amount;
      monthsWithExpensiveDebt.add(key);
    }
  }

  // Só contam meses com movimento: a Pluggy pode não ter o histórico todo.
  const months = keys
    .map((key) => monthTotals.get(key))
    .filter((month): month is BaselineMonth => Boolean(month))
    .map((month) => ({
      key: month.key,
      income: round(month.income),
      expenses: round(month.expenses),
      essential: round(month.essential),
      discretionary: round(month.discretionary),
    }));
  const analyzed = months.map((month) => month.key);
  const typicalOf = (map: Map<string, number>) =>
    round(median(analyzed.map((key) => map.get(key) ?? 0)));

  const incomes = months.map((month) => month.income);
  const typicalIncome = round(median(incomes));
  const typicalExpenses = round(median(months.map((month) => month.expenses)));
  const savingsCapacity = round(typicalIncome - typicalExpenses);
  const lastKey = analyzed.at(-1);

  const groups: BaselineGroup[] = [...groupTotals.entries()]
    .map(([groupId, byMonth]) => {
      const category = getTransactionCategory(groupId, null);
      return {
        groupId,
        label: category.groupLabel,
        icon: category.icon,
        essential: essentialGroups.has(groupId),
        monthlyTypical: typicalOf(byMonth),
        lastMonth: round(lastKey ? (byMonth.get(lastKey) ?? 0) : 0),
      };
    })
    .filter((group) => group.monthlyTypical > 0 || group.lastMonth > 0)
    .sort((a, b) => b.monthlyTypical - a.monthlyTypical);

  const members: BaselineMemberSummary[] = [...memberTotals.values()]
    .map(({ member, income, expenses }) => ({
      memberId: member?.id ?? null,
      name: member?.name ?? unassignedMemberName,
      typicalIncome: typicalOf(income),
      typicalExpenses: typicalOf(expenses),
    }))
    .sort((a, b) => b.typicalIncome - a.typicalIncome);

  return {
    monthsAnalyzed: months.length,
    confidence:
      months.length >= 6 ? "high" : months.length >= 3 ? "medium" : "low",
    months,
    typicalIncome,
    typicalExpenses,
    typicalEssential: round(median(months.map((month) => month.essential))),
    typicalDiscretionary: round(
      median(months.map((month) => month.discretionary)),
    ),
    averageIncome: round(
      incomes.reduce((sum, value) => sum + value, 0) / (months.length || 1),
    ),
    averageExpenses: round(
      months.reduce((sum, month) => sum + month.expenses, 0) /
        (months.length || 1),
    ),
    savingsCapacity,
    savingsRate:
      typicalIncome > 0
        ? Math.round((savingsCapacity / typicalIncome) * 1000) / 1000
        : 0,
    incomeVariation:
      typicalIncome > 0 && incomes.length > 1
        ? Math.round(
            ((Math.max(...incomes) - Math.min(...incomes)) / typicalIncome) *
              100,
          ) / 100
        : 0,
    groups,
    members,
    debt: {
      financingMonthly: typicalOf(financing),
      loansMonthly: typicalOf(loans),
      interestAndFees: round(interestAndFees),
      hasExpensiveDebt: monthsWithExpensiveDebt.size > 1,
    },
  };
}
