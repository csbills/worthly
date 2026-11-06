import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { getBudgetsOverview } from "@/actions/budgets";
import { getCategorySpending } from "@/actions/categories";
import { getCreditCards } from "@/actions/credit-cards";
import { getDashboardOverview } from "@/actions/dashboard";
import { listGoals } from "@/actions/goals";
import { getInvestments } from "@/actions/investments";
import { getConnectedAccounts } from "@/actions/pluggy";
import { getSubscriptions } from "@/actions/subscriptions";
import { getTransactions } from "@/actions/transactions";
import {
  assistantPeriodKeys,
  compactToolResult,
  parseEmptyToolInput,
  parseMonthToolInput,
  parseTransactionsToolInput,
  type ToolInputResult,
} from "@/lib/assistant/tool-input";
import { defaultTransactionFilters } from "@/lib/transaction-filters";
import { summarizeTransactions } from "@/lib/transaction-summary";

type ToolDefinition<T> = {
  tool: Anthropic.Beta.BetaTool;
  /** Rótulo curto mostrado enquanto a ferramenta roda ("Lendo transações…"). */
  label: string;
  parse: (input: unknown) => ToolInputResult<T>;
  run: (input: T) => Promise<unknown>;
};

function defineTool<T>(definition: ToolDefinition<T>) {
  return definition as ToolDefinition<unknown>;
}

const emptySchema: Anthropic.Beta.BetaTool.InputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const registry: ToolDefinition<unknown>[] = [
  defineTool({
    label: "Lendo suas transações",
    tool: {
      name: "get_transactions",
      description:
        "Lista transações das contas e cartões conectados, já com a categoria final (ajustes do usuário incluídos), e devolve os totais de receitas, despesas e saldo do período. Use para perguntas sobre gastos específicos, lojas, valores, datas e para conferir números antes de responder. Valores de DEBIT são saídas; CREDIT são entradas. Transações com excludeFromSummary=true (transferências próprias, pagamentos de fatura, ignoradas) não entram nos totais.",
      eager_input_streaming: true,
      input_schema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: [...assistantPeriodKeys],
            description: "Período pronto. Padrão: current-month.",
          },
          date_from: {
            type: "string",
            description:
              "Início (YYYY-MM-DD, inclusivo). Com date_from/date_to, period é ignorado.",
          },
          date_to: {
            type: "string",
            description: "Fim (YYYY-MM-DD, exclusivo).",
          },
          search: {
            type: "string",
            description:
              "Trecho para buscar na descrição, banco ou categoria (ex.: ifood, uber).",
          },
          type: {
            type: "string",
            enum: ["all", "CREDIT", "DEBIT"],
          },
          category: {
            type: "string",
            description: "Nome exato da categoria, como aparece no app.",
          },
          limit: {
            type: "integer",
            description: "Máximo de transações na lista (padrão 50, até 200).",
          },
        },
        additionalProperties: false,
      },
    },
    parse: parseTransactionsToolInput,
    run: async (input) => {
      const result = await getTransactions({
        ...defaultTransactionFilters,
        period: input.period,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        search: input.search,
        type: input.type,
        category: input.category,
        showHidden: true,
      });

      return {
        period: result.period,
        totals: summarizeTransactions(result.transactions),
        transactionCount: result.transactions.length,
        transactions: result.transactions.slice(0, input.limit).map((t) => ({
          date: t.date.slice(0, 10),
          description: t.description,
          type: t.type,
          amount: Math.abs(t.amount),
          currency: t.currencyCode,
          category: t.categoryLabel,
          account: `${t.bankName} · ${t.accountName}`,
          note: t.note,
          excludeFromSummary: t.excludeFromSummary,
        })),
        error: result.error,
      };
    },
  }),
  defineTool({
    label: "Somando gastos por categoria",
    tool: {
      name: "get_spending_by_category",
      description:
        "Gastos de um mês agrupados por categoria e subcategoria, com valor, percentual e número de transações. Use para 'para onde foi meu dinheiro', comparações entre categorias e entre meses.",
      eager_input_streaming: true,
      input_schema: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "Mês no formato YYYY-MM. Padrão: mês atual.",
          },
        },
        additionalProperties: false,
      },
    },
    parse: parseMonthToolInput,
    run: async ({ month }) => getCategorySpending(month ?? undefined),
  }),
  defineTool({
    label: "Olhando o panorama do mês",
    tool: {
      name: "get_overview",
      description:
        "Panorama atual: patrimônio líquido (contas + investimentos - cartões) e sua evolução, fluxo de caixa do mês atual e do anterior (receitas, despesas, saldo, taxa de poupança) e ritmo de gastos dia a dia comparado ao mês passado.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => {
      const overview = await getDashboardOverview();
      return {
        ...overview,
        netWorth: {
          ...overview.netWorth,
          history: overview.netWorth.history.filter(
            (_, index, all) => index % 7 === 0 || index === all.length - 1,
          ),
        },
      };
    },
  }),
  defineTool({
    label: "Conferindo contas e saldos",
    tool: {
      name: "get_accounts",
      description:
        "Contas e cartões conectados com saldo atual, e para cartões o limite total e disponível.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => {
      const result = await getConnectedAccounts();
      return {
        accounts: result.accounts.map((account) => ({
          name: account.marketingName || account.name,
          type: account.type,
          subtype: account.subtype,
          balance: account.balance,
          currency: account.currencyCode,
          creditLimit: account.creditData?.creditLimit ?? null,
          availableCredit: account.creditData?.availableCreditLimit ?? null,
        })),
        error: result.error,
      };
    },
  }),
  defineTool({
    label: "Abrindo as faturas",
    tool: {
      name: "get_credit_cards",
      description:
        "Cartões de crédito com fatura a pagar, próxima fatura em formação, última fatura fechada, vencimentos e limites.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => getCreditCards(),
  }),
  defineTool({
    label: "Consultando investimentos",
    tool: {
      name: "get_investments",
      description:
        "Carteira de investimentos: cada ativo com saldo, custo e rentabilidade, e o resumo por moeda.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => getInvestments(),
  }),
  defineTool({
    label: "Conferindo os orçamentos",
    tool: {
      name: "get_budgets",
      description:
        "Orçamentos mensais por grupo de categoria: limite, gasto do mês, quanto falta, projeção de fechamento no ritmo atual e situação (ok, warning, over). Traz também sugestões de limite para grupos sem orçamento, pela média dos três meses anteriores.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => getBudgetsOverview(),
  }),
  defineTool({
    label: "Procurando assinaturas",
    tool: {
      name: "get_subscriptions",
      description:
        "Assinaturas e contas recorrentes detectadas no último ano (semanais, mensais e anuais), com último valor, custo mensal equivalente, próxima cobrança prevista, aumentos de preço (priceChange) e as que começaram há pouco (isNew). Parcelas de compras não entram.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => getSubscriptions(),
  }),
  defineTool({
    label: "Olhando as metas",
    tool: {
      name: "get_goals",
      description:
        "Metas de economia do usuário: valor-alvo, quanto já foi guardado, progresso, data-alvo e quanto guardar por mês para chegar lá.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => listGoals(),
  }),
];

/** Ferramentas extras registradas por outros módulos (orçamentos, metas…). */
export function registerAssistantTool<T>(definition: ToolDefinition<T>) {
  if (!registry.some((entry) => entry.tool.name === definition.tool.name)) {
    registry.push(definition as ToolDefinition<unknown>);
  }
}

export function getAssistantTools(): Anthropic.Beta.BetaTool[] {
  return registry.map((entry) => entry.tool);
}

export function getAssistantToolLabel(name: string) {
  return (
    registry.find((entry) => entry.tool.name === name)?.label ?? "Pensando"
  );
}

/**
 * Roda uma ferramenta pedida pelo modelo. Entrada inválida ou erro viram um
 * tool_result com is_error, para o modelo corrigir e tentar de novo.
 */
export async function runAssistantTool(
  block: Anthropic.Beta.BetaToolUseBlock,
): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  const entry = registry.find((item) => item.tool.name === block.name);

  if (!entry) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: `Ferramenta desconhecida: ${block.name}`,
    };
  }

  const parsed = entry.parse(block.input);

  if (!parsed.ok) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: JSON.stringify({ INVALID_INPUT: parsed.error }),
    };
  }

  try {
    const result = await entry.run(parsed.value);
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(compactToolResult(result)),
    };
  } catch {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: "Não foi possível ler esses dados agora.",
    };
  }
}
