import { describe, expect, it } from "vitest";

import {
  getTransactionCategory,
  translateTransactionCategory,
} from "./transaction-category-dictionary";

describe("Transaction category dictionary", () => {
  it("translates category names and resolves their top-level group", () => {
    expect(translateTransactionCategory("Housing")).toBe("Moradia");
    expect(translateTransactionCategory("Electricity")).toBe("Eletricidade");
    expect(translateTransactionCategory(null)).toBe("Sem categoria");

    expect(getTransactionCategory("17020002", "Electricity")).toMatchObject({
      id: "17020002",
      label: "Eletricidade",
      groupId: "17000000",
      groupLabel: "Moradia",
      icon: "🏠",
    });
    expect(getTransactionCategory("14000000", "Gambling")).toMatchObject({
      label: "Apostas",
      groupLabel: "Apostas",
      icon: "🎰",
    });
  });

  it("keeps unknown categories visible under Outros", () => {
    expect(getTransactionCategory(null, "Nova categoria")).toMatchObject({
      id: "unknown:nova categoria",
      label: "Nova categoria",
      groupId: "99999999",
      groupLabel: "Outros",
      icon: "📦",
    });
  });
});
