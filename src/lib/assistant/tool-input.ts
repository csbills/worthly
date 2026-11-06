/**
 * Validação das entradas que o modelo manda para as ferramentas. Com
 * eager_input_streaming a API não valida mais o JSON, então cada ferramenta
 * confere o que recebeu antes de rodar. Módulo puro, testado à parte.
 */

export const assistantPeriodKeys = [
  "current-month",
  "previous-month",
  "last-30-days",
  "last-90-days",
  "last-6-months",
  "current-year",
  "previous-year",
  "all",
] as const;

export type AssistantPeriod = (typeof assistantPeriodKeys)[number];

export type TransactionsToolInput = {
  period: AssistantPeriod | "custom";
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
  type: "all" | "CREDIT" | "DEBIT";
  category: string | null;
  limit: number;
};

export type ToolInputResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const monthKey = /^\d{4}-(0[1-9]|1[0-2])$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  input: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = input[key];
  if (value === undefined || value === null) return null;
  return typeof value === "string" ? value.trim() : undefined;
}

export function parseTransactionsToolInput(
  input: unknown,
): ToolInputResult<TransactionsToolInput> {
  if (!isRecord(input)) return { ok: false, error: "input must be an object" };

  const period = input.period ?? "current-month";
  const dateFrom = optionalString(input, "date_from");
  const dateTo = optionalString(input, "date_to");
  const search = optionalString(input, "search");
  const category = optionalString(input, "category");
  const type = input.type ?? "all";
  const limit = input.limit ?? 50;

  if (
    typeof period !== "string" ||
    !(assistantPeriodKeys as readonly string[]).includes(period)
  ) {
    return {
      ok: false,
      error: `period must be one of ${assistantPeriodKeys.join(", ")}`,
    };
  }
  if (dateFrom === undefined || (dateFrom && !isoDate.test(dateFrom))) {
    return { ok: false, error: "date_from must be YYYY-MM-DD" };
  }
  if (dateTo === undefined || (dateTo && !isoDate.test(dateTo))) {
    return { ok: false, error: "date_to must be YYYY-MM-DD" };
  }
  if (search === undefined || category === undefined) {
    return { ok: false, error: "search and category must be strings" };
  }
  if (type !== "all" && type !== "CREDIT" && type !== "DEBIT") {
    return { ok: false, error: "type must be all, CREDIT or DEBIT" };
  }
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    return { ok: false, error: "limit must be a positive integer" };
  }

  const custom = Boolean(dateFrom || dateTo);

  return {
    ok: true,
    value: {
      period: custom ? "custom" : (period as AssistantPeriod),
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      search: search ?? "",
      type,
      category: category || null,
      limit: Math.min(limit, 200),
    },
  };
}

export function parseMonthToolInput(
  input: unknown,
): ToolInputResult<{ month: string | null }> {
  if (!isRecord(input)) return { ok: false, error: "input must be an object" };

  const month = optionalString(input, "month");

  if (month === undefined || (month && !monthKey.test(month))) {
    return { ok: false, error: "month must be YYYY-MM" };
  }

  return { ok: true, value: { month: month || null } };
}

export function parseEmptyToolInput(
  input: unknown,
): ToolInputResult<Record<string, never>> {
  return isRecord(input)
    ? { ok: true, value: {} }
    : { ok: false, error: "input must be an object" };
}

const droppedKeys = new Set([
  "bankLogoPath",
  "logoPath",
  "connectorImageUrl",
  "imageUrl",
  "logoUrl",
  "icon",
  "categoryIcon",
  "color",
]);

/**
 * Deixa o resultado de uma ferramenta enxuto para o modelo: tira campos
 * visuais (logos, cores, ícones), arredonda centavos e corta listas longas.
 */
export function compactToolResult(value: unknown, maxItems = 120): unknown {
  if (Array.isArray(value)) {
    const items = value
      .slice(0, maxItems)
      .map((item) => compactToolResult(item, maxItems));
    return value.length > maxItems
      ? [...items, `… e mais ${value.length - maxItems} itens`]
      : items;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, entry]) => !droppedKeys.has(key) && entry !== undefined)
        .map(([key, entry]) => [key, compactToolResult(entry, maxItems)]),
    );
  }

  return value;
}

export type SimulationToolInput = {
  extraMonthly: number;
  desiredMonthlyCost: number | null;
  targetAge: number | null;
  realReturn: number | null;
};

/** Hipóteses para simular o plano ("e se guardarmos R$ 500 a mais?"). */
export function parseSimulationToolInput(
  input: unknown,
): ToolInputResult<SimulationToolInput> {
  if (!isRecord(input)) return { ok: false, error: "input must be an object" };

  const number = (key: string) => {
    const value = input[key];
    if (value === undefined || value === null) return null;
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  };
  const extraMonthly = number("extra_monthly");
  const desiredMonthlyCost = number("desired_monthly_cost");
  const targetAge = number("target_age");
  const realReturn = number("real_return");

  if (
    [extraMonthly, desiredMonthlyCost, targetAge, realReturn].includes(
      undefined,
    )
  ) {
    return { ok: false, error: "all fields must be numbers" };
  }
  if (
    desiredMonthlyCost !== null &&
    desiredMonthlyCost !== undefined &&
    desiredMonthlyCost <= 0
  ) {
    return { ok: false, error: "desired_monthly_cost must be positive" };
  }
  if (
    targetAge !== null &&
    targetAge !== undefined &&
    (targetAge < 30 || targetAge > 90)
  ) {
    return { ok: false, error: "target_age must be between 30 and 90" };
  }
  if (
    realReturn !== null &&
    realReturn !== undefined &&
    (realReturn < 0 || realReturn > 10)
  ) {
    return { ok: false, error: "real_return must be between 0 and 10" };
  }

  return {
    ok: true,
    value: {
      extraMonthly: extraMonthly ?? 0,
      desiredMonthlyCost: desiredMonthlyCost ?? null,
      targetAge: targetAge ?? null,
      realReturn: realReturn ?? null,
    },
  };
}
