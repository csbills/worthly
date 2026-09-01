import {
  summarizeTransactions,
  type TransactionSummaryInput,
} from "./transaction-summary";

export type CashFlowTransactionInput = TransactionSummaryInput;

export type CashFlowSummary = {
  receipts: number;
  expenses: number;
  balance: number;
  savingsRate: number | null;
  estimatedInvestmentCapacity: number;
};

export function summarizeCashFlow(
  transactions: readonly CashFlowTransactionInput[],
): CashFlowSummary {
  const summary = summarizeTransactions(transactions);

  return {
    receipts: summary.receipts,
    expenses: summary.expenses,
    balance: summary.balance,
    savingsRate:
      summary.receipts > 0 ? (summary.balance / summary.receipts) * 100 : null,
    estimatedInvestmentCapacity: Math.max(summary.balance, 0),
  };
}
