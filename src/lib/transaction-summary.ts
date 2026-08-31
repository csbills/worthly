export type TransactionSummaryInput = {
  type: "CREDIT" | "DEBIT";
  amount: number;
  excludeFromSummary?: boolean;
};

export type TransactionSummary = {
  total: number;
  receipts: number;
  expenses: number;
  balance: number;
};

export function summarizeTransactions(
  transactions: readonly TransactionSummaryInput[],
): TransactionSummary {
  const summary = transactions.reduce(
    (totals, transaction) => {
      const amount = Math.abs(transaction.amount);

      totals.total += 1;

      if (transaction.excludeFromSummary) {
        return totals;
      }

      if (transaction.type === "CREDIT") {
        totals.receipts += amount;
      } else {
        totals.expenses += amount;
      }

      return totals;
    },
    { total: 0, receipts: 0, expenses: 0 },
  );

  return {
    ...summary,
    balance: summary.receipts - summary.expenses,
  };
}
