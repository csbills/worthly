import { describe, expect, it } from "vitest";

import { getBankDisplayName, getBankLogoPath } from "./bank-assets";

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

  it("shortens known bank names for account displays", () => {
    expect(
      getBankDisplayName("NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO"),
    ).toBe("Nubank");
    expect(getBankDisplayName("BANCO INTER")).toBe("Inter");
    expect(getBankDisplayName("BANCO SANTANDER (BRASIL) S.A.")).toBe(
      "Santander",
    );
  });

  it("keeps the original name for banks outside the catalog", () => {
    expect(getBankDisplayName("Banco não catalogado")).toBe(
      "Banco não catalogado",
    );
  });

  it("returns no logo when the institution is outside the catalog", () => {
    expect(getBankLogoPath("Corretora não identificada")).toBeNull();
  });
});
