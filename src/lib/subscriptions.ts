/**
 * Detecta cobranças recorrentes (assinaturas, mensalidades, anuidades) no
 * histórico de saídas. Módulo puro: recebe transações já serializadas.
 */

export type RecurringInputTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  categoryLabel: string;
  excludeFromSummary: boolean;
  currencyCode: string;
  /** Parcelas de compras repetem todo mês, mas não são assinaturas. */
  installment?: boolean;
};

export type SubscriptionCadence = "weekly" | "monthly" | "yearly";

export type DetectedSubscription = {
  key: string;
  name: string;
  category: string;
  cadence: SubscriptionCadence;
  currencyCode: string;
  lastAmount: number;
  averageAmount: number;
  /** Custo equivalente por mês, para somar assinaturas de ritmos diferentes. */
  monthlyCost: number;
  occurrences: number;
  firstDate: string;
  lastDate: string;
  nextDate: string;
  /** Variação do último valor sobre o anterior, quando passa de 5%. */
  priceChange: number | null;
  /** Primeira cobrança há pouco tempo: vale conferir se foi de propósito. */
  isNew: boolean;
};

const DAY_MS = 86_400_000;

const noiseWords = new Set([
  "pagamento",
  "pag",
  "pgto",
  "compra",
  "debito",
  "credito",
  "cartao",
  "parcela",
  "assinatura",
  "mensalidade",
  "pix",
  "ltda",
  "sa",
  "s/a",
  "me",
  "eireli",
  "br",
  "brasil",
  "com",
  "www",
]);

/** Nome comparável: sem acento, números, pontuação e palavras genéricas. */
export function merchantKey(description: string) {
  const words = description
    .split("|")[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !noiseWords.has(word));

  return words.slice(0, 3).join(" ");
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function cadenceFor(interval: number): SubscriptionCadence | null {
  if (interval >= 5 && interval <= 9) return "weekly";
  if (interval >= 25 && interval <= 36) return "monthly";
  if (interval >= 330 && interval <= 400) return "yearly";
  return null;
}

const monthlyFactor: Record<SubscriptionCadence, number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

const toDay = (iso: string) => Math.floor(new Date(iso).getTime() / DAY_MS);
const fromDay = (day: number) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);

export function detectSubscriptions(
  transactions: readonly RecurringInputTransaction[],
  now: Date,
): DetectedSubscription[] {
  const groups = new Map<string, RecurringInputTransaction[]>();

  for (const transaction of transactions) {
    if (
      transaction.type !== "DEBIT" ||
      transaction.excludeFromSummary ||
      transaction.installment ||
      !Number.isFinite(transaction.amount)
    ) {
      continue;
    }
    const key = merchantKey(transaction.description);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(transaction);
    groups.set(key, list);
  }

  const today = Math.floor(now.getTime() / DAY_MS);
  const detected: DetectedSubscription[] = [];

  for (const [key, list] of groups) {
    // Uma cobrança por dia no máximo: compras repetidas no mesmo dia não contam.
    const byDay = new Map<number, RecurringInputTransaction>();
    for (const transaction of list)
      byDay.set(toDay(transaction.date), transaction);
    const charges = [...byDay.entries()].sort(([a], [b]) => a - b);

    if (charges.length < 2) continue;

    const intervals = charges
      .slice(1)
      .map(([day], index) => day - charges[index][0]);
    const cadence = cadenceFor(median(intervals));
    if (!cadence) continue;

    const amounts = charges.map(([, transaction]) =>
      Math.abs(transaction.amount),
    );
    const average =
      amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
    // Valores parecidos: até 20% (ou R$ 5) longe da média — preço muda às vezes.
    const consistent = amounts.every(
      (amount) => Math.abs(amount - average) <= Math.max(5, average * 0.2),
    );
    if (!consistent) continue;

    const [lastDay, last] = charges[charges.length - 1];
    const intervalDays = Math.round(median(intervals));
    // Parou de cobrar há mais de dois ciclos: provavelmente foi cancelada.
    if (today - lastDay > intervalDays * 2 + 5) continue;

    const lastAmount = amounts[amounts.length - 1];
    const previousAmount = amounts[amounts.length - 2];
    const change =
      previousAmount > 0 ? (lastAmount - previousAmount) / previousAmount : 0;

    detected.push({
      key,
      name: last.description.split("|")[0].trim(),
      category: last.categoryLabel,
      cadence,
      currencyCode: last.currencyCode,
      lastAmount,
      averageAmount: Math.round(average * 100) / 100,
      monthlyCost: Math.round(lastAmount * monthlyFactor[cadence] * 100) / 100,
      occurrences: charges.length,
      firstDate: fromDay(charges[0][0]),
      lastDate: fromDay(lastDay),
      nextDate: fromDay(lastDay + intervalDays),
      priceChange:
        Math.abs(change) > 0.05 ? Math.round(change * 1000) / 1000 : null,
      isNew: today - charges[0][0] <= 45,
    });
  }

  return detected.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
