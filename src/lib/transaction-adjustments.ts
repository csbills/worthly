/**
 * Ajustes do usuário sobre as transações da Pluggy: categoria escolhida à
 * mão, regras automáticas por descrição e lançamentos ignorados. Módulo puro;
 * a leitura do banco fica em transaction-adjustments-store.ts.
 */

export type TransactionOverrideRecord = {
  transactionId: string;
  categoryId: string | null;
  note: string | null;
  ignored: boolean;
};

export type CategoryRuleRecord = {
  id: string;
  pattern: string;
  categoryId: string;
};

export type TransactionAdjustments = {
  overrides: ReadonlyMap<string, TransactionOverrideRecord>;
  /** Mais antigas primeiro: a primeira que casar vence. */
  rules: readonly (CategoryRuleRecord & { normalizedPattern: string })[];
};

export const emptyTransactionAdjustments: TransactionAdjustments = {
  overrides: new Map(),
  rules: [],
};

const MIN_PATTERN_LENGTH = 2;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

/** O trecho como é comparado, ou null quando é curto demais para valer. */
export function normalizeRulePattern(pattern: string) {
  const normalized = normalizeText(pattern);

  return normalized.length >= MIN_PATTERN_LENGTH ? normalized : null;
}

export function createTransactionAdjustments({
  overrides,
  rules,
}: {
  overrides: readonly TransactionOverrideRecord[];
  rules: readonly CategoryRuleRecord[];
}): TransactionAdjustments {
  return {
    overrides: new Map(
      overrides.map((override) => [override.transactionId, override]),
    ),
    rules: rules.flatMap((rule) => {
      const normalizedPattern = normalizeRulePattern(rule.pattern);
      return normalizedPattern ? [{ ...rule, normalizedPattern }] : [];
    }),
  };
}

export function findMatchingRule(
  description: string | null | undefined,
  rules: TransactionAdjustments["rules"],
) {
  if (!description) return undefined;

  const normalizedDescription = normalizeText(description);

  return rules.find((rule) =>
    normalizedDescription.includes(rule.normalizedPattern),
  );
}

/** Categoria final: ajuste manual, depois regra, depois a da Pluggy. */
export function getAdjustedCategoryId(
  transaction: {
    id: string;
    description: string | null | undefined;
    categoryId: string | null | undefined;
  },
  adjustments: TransactionAdjustments,
): string | null {
  const override = adjustments.overrides.get(transaction.id);

  if (override?.categoryId) return override.categoryId;

  return (
    findMatchingRule(transaction.description, adjustments.rules)?.categoryId ??
    transaction.categoryId ??
    null
  );
}

export function isIgnoredTransaction(
  transactionId: string,
  adjustments: TransactionAdjustments,
) {
  return adjustments.overrides.get(transactionId)?.ignored ?? false;
}

export function getTransactionNote(
  transactionId: string,
  adjustments: TransactionAdjustments,
) {
  return adjustments.overrides.get(transactionId)?.note ?? null;
}

type AdjustableTransaction = {
  id: string;
  description?: string | null;
  descriptionRaw?: string | null;
  categoryId?: string | null;
  category?: string | null;
};

/**
 * Prepara transações da Pluggy para relatórios: tira as ignoradas e troca a
 * categoria pela final. Quando a categoria muda, o nome da Pluggy é
 * descartado para não competir com o id escolhido.
 */
export function applyTransactionAdjustments<T extends AdjustableTransaction>(
  transactions: readonly T[],
  adjustments: TransactionAdjustments,
): T[] {
  return transactions.flatMap((transaction) => {
    if (isIgnoredTransaction(transaction.id, adjustments)) return [];

    const categoryId = getAdjustedCategoryId(
      {
        id: transaction.id,
        description: transaction.description || transaction.descriptionRaw,
        categoryId: transaction.categoryId,
      },
      adjustments,
    );

    return categoryId === (transaction.categoryId ?? null)
      ? [transaction]
      : [{ ...transaction, categoryId, category: null }];
  });
}
