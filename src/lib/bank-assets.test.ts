import { describe, expect, it } from "vitest";

import { getBankLogoPath } from "./bank-assets";

describe("Bank asset logos", () => {
  it("resolves the Nubank logo from the NU Financeira identity", () => {
    expect(
      getBankLogoPath(
        "NU FINANCEIRA S.A. - SOCIEDADE DE CREDITO, FINANCIAMENTO E INVESTIMENTO",
      ),
    ).toBe("/assets/banks/nubank.svg");
  });

  it("resolves the Santander logo from the institution identity", () => {
    expect(getBankLogoPath("BANCO SANTANDER (BRASIL) S.A.")).toBe(
      "/assets/banks/santander.svg",
    );
  });

  it("returns no logo when the institution is outside the catalog", () => {
    expect(getBankLogoPath("Corretora não identificada")).toBeNull();
  });
});
