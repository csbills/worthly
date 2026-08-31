import { describe, expect, it } from "vitest";

import { summarizeSpendingPaceTooltip } from "./spending-pace-tooltip";

describe("summarizeSpendingPaceTooltip", () => {
  it("calcula o aumento diário em relação ao mês passado", () => {
    expect(summarizeSpendingPaceTooltip(8139, 4777)).toEqual({
      direction: "increase",
      difference: 3362,
      percentage: 70,
    });
  });

  it("calcula a redução diária em relação ao mês passado", () => {
    expect(summarizeSpendingPaceTooltip(3000, 4000)).toEqual({
      direction: "decrease",
      difference: -1000,
      percentage: 25,
    });
  });

  it("não compara pontos quando uma das séries não tem valor", () => {
    expect(summarizeSpendingPaceTooltip(null, 4000)).toBeNull();
    expect(summarizeSpendingPaceTooltip(3000, null)).toBeNull();
  });

  it("não divide por zero quando o mês passado ainda não tem gastos", () => {
    expect(summarizeSpendingPaceTooltip(3000, 0)).toEqual({
      direction: "increase",
      difference: 3000,
      percentage: null,
    });
  });
});
