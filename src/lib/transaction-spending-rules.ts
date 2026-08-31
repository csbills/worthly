import type { Transaction } from "pluggy-sdk";

const investmentCategoryPrefix = "03";
const samePersonTransferCategoryPrefix = "04";
const internalTransferCategoryId = "05060000";
const nonSpendingOperationTypes = new Set([
  "APLIC_FINANCEIRA",
  "RESGATE_APLIC_FINANCEIRA",
  "PORTABILIDADE",
]);

function normalizeCategory(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim() ?? ""
  );
}

export type SpendingRuleTransaction = Pick<
  Transaction,
  "category" | "categoryId" | "operationType" | "type"
>;

export function isNonSpendingTransaction(transaction: SpendingRuleTransaction) {
  const categoryId = transaction.categoryId?.trim() ?? "";

  if (
    categoryId.startsWith(investmentCategoryPrefix) ||
    categoryId === internalTransferCategoryId
  ) {
    return true;
  }

  const category = normalizeCategory(transaction.category);

  if (
    categoryId.startsWith(samePersonTransferCategoryPrefix) ||
    category === "same person transfer" ||
    category.startsWith("same person transfer -") ||
    category === "transferencia para mesma pessoa" ||
    category.startsWith("transferencia para mesma pessoa -")
  ) {
    return transaction.type === "DEBIT";
  }

  if (category === "investments" || category.startsWith("investment ")) {
    return true;
  }

  return nonSpendingOperationTypes.has(
    transaction.operationType?.trim().toUpperCase() ?? "",
  );
}
