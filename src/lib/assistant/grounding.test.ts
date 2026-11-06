import { describe, expect, it } from "vitest";

import {
  collectEvidenceNumbers,
  extractMoneyAmounts,
  findUnverifiedAmounts,
} from "./grounding";

describe("grounding check", () => {
  it("reads Brazilian money formats", () => {
    expect(
      extractMoneyAmounts(
        "Sobram R$ 5.289,40 por mês; o carro de R$ 25 mil e R$1.500 de reserva, R$ 2,4 milhões no fim.",
      ).map((amount) => amount.value),
    ).toEqual([5289.4, 25000, 1500, 2_400_000]);
  });

  it("accepts values that came from tools or from the user, within rounding", () => {
    const evidence = collectEvidenceNumbers({
      toolResults: [
        '{"savingsCapacity":5289.4,"extraNeeded":890,"target":2355000}',
      ],
      userTexts: ["quero um carro de 25 mil e a cozinha de 7.000"],
    });

    expect(
      findUnverifiedAmounts(
        "Sobram cerca de R$ 5,3 mil. Faltam R$ 890 por mês para o carro de R$ 25 mil e a cozinha de R$ 7.000, rumo a R$ 2,4 milhões.",
        evidence,
      ),
    ).toEqual([]);
  });

  it("flags amounts the model made up or computed on its own", () => {
    const evidence = collectEvidenceNumbers({
      toolResults: ['{"savingsCapacity":5289.4}'],
      userTexts: ["carro de 25 mil em 11 meses"],
    });

    expect(
      findUnverifiedAmounts(
        "Você precisa guardar R$ 2.273 por mês, e ainda sobra R$ 3.016. R$ 5 de taxa não importa.",
        evidence,
      ),
    ).toEqual(["R$ 2.273", "R$ 3.016"]);
  });
});
