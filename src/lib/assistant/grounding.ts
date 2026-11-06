/**
 * Checagem de valores: todo "R$" que o Tito escreve precisa aparecer nos
 * dados que as ferramentas devolveram ou no que o próprio usuário disse.
 * O que não aparece fica marcado na tela como "não conferido". Não impede
 * a resposta; deixa claro o que é cálculo do modelo e o que é dado.
 */

const TOLERANCE = 0.03;
const MIN_AMOUNT = 10;

function parseBrazilianNumber(raw: string) {
  // "1.234,56" → 1234.56; "1234.56" (JSON) é tratado à parte.
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function multiplier(word: string | undefined) {
  if (!word) return 1;
  const lower = word.toLocaleLowerCase("pt-BR");
  if (lower.startsWith("mil"))
    return lower.startsWith("milh") ? 1_000_000 : 1000;
  if (lower === "mi") return 1_000_000;
  if (lower === "bi" || lower.startsWith("bilh")) return 1_000_000_000;
  return 1;
}

const moneyPattern =
  /R\$\s?(-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|-?\d+(?:,\d{1,2})?)(?:\s?(milh(?:ão|ões)|mil|mi|bilh(?:ão|ões)|bi)\b)?/gi;

/** Valores em reais citados num texto ("R$ 1.234,56", "R$ 25 mil"). */
export function extractMoneyAmounts(text: string) {
  const amounts: { raw: string; value: number }[] = [];
  for (const match of text.matchAll(moneyPattern)) {
    const base = parseBrazilianNumber(match[1]);
    if (base === null) continue;
    amounts.push({
      raw: match[0].trim(),
      value: Math.abs(base * multiplier(match[2])),
    });
  }
  return amounts;
}

/** Números que servem de prova: os do JSON das ferramentas e os do usuário. */
export function collectEvidenceNumbers({
  toolResults,
  userTexts,
}: {
  toolResults: readonly string[];
  userTexts: readonly string[];
}) {
  const numbers: number[] = [];

  for (const content of toolResults) {
    for (const match of content.matchAll(/-?\d+(?:\.\d+)?/g)) {
      numbers.push(Math.abs(Number(match[0])));
    }
  }
  for (const text of userTexts) {
    for (const match of text.matchAll(
      /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s?(milh(?:ão|ões)|mil|mi|k)\b)?/gi,
    )) {
      const base = parseBrazilianNumber(match[1]);
      if (base === null) continue;
      const unit =
        match[2]?.toLocaleLowerCase("pt-BR") === "k"
          ? 1000
          : multiplier(match[2]);
      numbers.push(base * unit);
    }
  }

  return numbers;
}

export function findUnverifiedAmounts(
  text: string,
  evidence: readonly number[],
): string[] {
  const unverified: string[] = [];

  for (const amount of extractMoneyAmounts(text)) {
    if (amount.value < MIN_AMOUNT) continue;
    const grounded = evidence.some(
      (number) =>
        Math.abs(number - amount.value) <=
        Math.max(1, amount.value * TOLERANCE),
    );
    if (!grounded && !unverified.includes(amount.raw))
      unverified.push(amount.raw);
  }

  return unverified;
}
