import type { InvestmentType } from "pluggy-sdk";

export const investmentCategoryColors: Record<InvestmentType, string> = {
  COE: "#ea580c",
  EQUITY: "#7c3aed",
  ETF: "#ca8a04",
  FIXED_INCOME: "#0f766e",
  MUTUAL_FUND: "#2563eb",
  OTHER: "#64748b",
  SECURITY: "#db2777",
};
