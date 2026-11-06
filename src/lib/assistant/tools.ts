import "server-only";

import { getBudgetsOverview } from "@/actions/budgets";
import { getCategorySpending } from "@/actions/categories";
import { getCreditCards } from "@/actions/credit-cards";
import { getDashboardOverview } from "@/actions/dashboard";
import {
  getFinancialPlan,
  simulateFinancialPlan,
} from "@/actions/financial-plan";
import { createGoalProposal, scheduleGoals } from "@/actions/goal-proposals";
import { listGoals } from "@/actions/goals";
import { getInvestments } from "@/actions/investments";
import { getConnectedAccounts } from "@/actions/pluggy";
import { getSubscriptions } from "@/actions/subscriptions";
import { getTransactions } from "@/actions/transactions";
import {
  type ChatPart,
  INVALID_TOOL_INPUT,
  type ToolSpec,
} from "@/lib/assistant/providers/contract";
import {
  assistantPeriodKeys,
  compactToolResult,
  parseEmptyToolInput,
  parseGoalProposalInput,
  parseMonthToolInput,
  parseSimulationToolInput,
  parseTransactionsToolInput,
  type ToolInputResult,
} from "@/lib/assistant/tool-input";
import type { FinancialPlan } from "@/lib/financial-plan";
import { defaultTransactionFilters } from "@/lib/transaction-filters";
import { summarizeTransactions } from "@/lib/transaction-summary";

/** Definição no formato JSON Schema, igual para todos os providers. */
type ToolDescriptor = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  /** Mantido por compatibilidade; o adaptador da Anthropic já liga o streaming. */
  eager_input_streaming?: boolean;
};

type ToolDefinition<T> = {
  tool: ToolDescriptor;
  /** Rótulo curto mostrado enquanto a ferramenta roda ("Lendo transações…"). */
  label: string;
  parse: (input: unknown) => ToolInputResult<T>;
  run: (input: T, call: AssistantToolCall) => Promise<unknown>;
};

function defineTool<T>(definition: ToolDefinition<T>) {
  return definition as ToolDefinition<unknown>;
}

const emptySchema: Record<string, unknown> = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

/** O plano sem as séries do gráfico, que só pesam no contexto. */
function planForModel(plan: FinancialPlan) {
  return {
    ...plan,
    independence: {
      ...plan.independence,
      scenarios: plan.independence.scenarios.map(({ points, ...scenario }) => ({
        ...scenario,
        investedIn10Years: points[9]?.value ?? null,
      })),
    },
  };
}

const goalsSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    goals: {
      type: "array",
      description: "De 1 a 8 metas.",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nome curto (ex.: Carro, Reforma da cozinha).",
          },
          emoji: {
            type: "string",
            description: "Um emoji que represente a meta.",
          },
          target_amount: {
            type: "number",
            description:
              "Valor total em reais. Só use valores ditos pelo usuário ou confirmados por ele.",
          },
          saved_amount: {
            type: "number",
            description: "Quanto já está guardado para esta meta (padrão 0).",
          },
          target_month: {
            type: "string",
            description: "Mês-limite no formato YYYY-MM, depois do mês atual.",
          },
          priority: {
            type: "integer",
            description:
              "1 = mais importante. Use a ordem que o usuário indicar.",
          },
        },
        required: ["name", "target_amount", "target_month"],
        additionalProperties: false,
      },
    },
  },
  required: ["goals"],
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
  defineTool({
    label: "Montando o plano da casa",
    tool: {
      name: "get_financial_plan",
      description:
        "O plano financeiro da casa inteira (todas as pessoas conectadas): perfil da família (quem vive da renda, dependentes, estabilidade, idade, objetivo, observações), raio-X dos últimos 6 meses fechados (renda e gasto típicos pela mediana, essenciais x escolha, por pessoa, por grupo de categoria, sinais de dívida cara), compromissos fixos com data de fim, reserva de emergência recomendada, passos na ordem certa, cenários até a independência financeira, valor mensal necessário para a idade-alvo, cortes realistas e metas sugeridas. Use antes de qualquer conversa sobre metas, planos, reserva, aposentadoria ou independência.",
      eager_input_streaming: true,
      input_schema: emptySchema,
    },
    parse: parseEmptyToolInput,
    run: async () => {
      const result = await getFinancialPlan();
      return {
        profile: result.profile,
        members: result.members,
        obligations: result.obligations,
        obligationCandidates: result.candidates,
        balances: result.balances,
        baseline: { ...result.baseline, months: result.baseline.months },
        plan: planForModel(result.plan),
        ownershipIncomplete: result.ownershipIncomplete,
        error: result.error,
      };
    },
  }),
  defineTool({
    label: "Simulando cenários",
    tool: {
      name: "simulate_plan",
      description:
        "Recalcula o plano com hipóteses, sem salvar nada: guardar mais (ou menos) por mês, outro custo de vida na independência, outra idade-alvo ou outro retorno real. Devolve o plano atual (base) e o simulado para comparar prazos, idade de chegada e o valor mensal necessário. Use para perguntas 'e se…'.",
      eager_input_streaming: true,
      input_schema: {
        type: "object",
        properties: {
          extra_monthly: {
            type: "number",
            description:
              "Quanto a mais por mês a casa guardaria (negativo = guardar menos), em reais.",
          },
          desired_monthly_cost: {
            type: "number",
            description:
              "Custo de vida mensal desejado na independência, em reais de hoje.",
          },
          target_age: {
            type: "number",
            description: "Idade-alvo para a independência (30 a 90).",
          },
          real_return: {
            type: "number",
            description: "Retorno anual acima da inflação em % (0 a 10).",
          },
        },
        additionalProperties: false,
      },
    },
    parse: parseSimulationToolInput,
    run: async (input) => {
      const { base, simulated } = await simulateFinancialPlan(input);
      return { base: planForModel(base), simulated: planForModel(simulated) };
    },
  }),
  defineTool({
    label: "Organizando as metas",
    tool: {
      name: "plan_goals",
      description:
        "Calcula, sem salvar nada, como encaixar metas com data na sobra mensal da casa (junto com as metas com data que já existem e mantendo a reserva de emergência). Devolve, para cada meta, o mês em que fica pronta e se cabe no prazo, as fases mês a mês, quanto falta por mês se não couber, economias sugeridas nos gastos de escolha e novas datas quando nem as economias bastam. Use para explorar opções antes de propor. Os números da resposta vêm deste cálculo: não refaça as contas.",
      input_schema: goalsSchema,
    },
    parse: (input) => parseGoalProposalInput(input, new Date()),
    run: async ({ goals }) => (await scheduleGoals(goals)).schedule,
  }),
  defineTool({
    label: "Preparando as metas para você confirmar",
    tool: {
      name: "propose_goals",
      description:
        "Propõe criar metas: faz o mesmo cálculo de plan_goals e mostra ao usuário um cartão com o plano e os botões para criar as metas (e, se houver economias sugeridas, orçamentos para elas). Nada é criado até o usuário confirmar no cartão. Use quando o usuário pedir para organizar ou criar metas e os valores e datas estiverem definidos. Depois de chamar, diga que o cartão está logo abaixo — nunca que as metas já foram criadas.",
      input_schema: goalsSchema,
    },
    parse: (input) => parseGoalProposalInput(input, new Date()),
    run: async ({ goals }) => {
      const proposal = await createGoalProposal(goals);
      return {
        proposalId: proposal.id,
        status: "aguardando confirmação do usuário",
        schedule: proposal.schedule,
      };
    },
  }),
];

/** Ferramentas extras registradas por outros módulos (orçamentos, metas…). */
export function registerAssistantTool<T>(definition: ToolDefinition<T>) {
  if (!registry.some((entry) => entry.tool.name === definition.tool.name)) {
    registry.push(definition as ToolDefinition<unknown>);
  }
}

export function getAssistantTools(): ToolSpec[] {
  return registry.map((entry) => ({
    name: entry.tool.name,
    description: entry.tool.description,
    inputSchema: entry.tool.input_schema,
  }));
}

export function getAssistantToolLabel(name: string) {
  return (
    registry.find((entry) => entry.tool.name === name)?.label ?? "Pensando"
  );
}

export type AssistantToolCall = { id: string; name: string; input: unknown };

type ToolResultPart = Extract<ChatPart, { type: "tool_result" }>;

function errorResult(call: AssistantToolCall, content: string): ToolResultPart {
  return { type: "tool_result", toolCallId: call.id, isError: true, content };
}

/**
 * Roda uma ferramenta pedida pelo modelo. Entrada inválida (inclusive JSON
 * quebrado) ou erro viram um resultado com isError, para o modelo corrigir e
 * tentar de novo — nunca uma exceção.
 */
export async function runAssistantTool(
  call: AssistantToolCall,
): Promise<ToolResultPart> {
  const entry = registry.find((item) => item.tool.name === call.name);

  if (!entry) return errorResult(call, `Ferramenta desconhecida: ${call.name}`);

  if (
    call.input &&
    typeof call.input === "object" &&
    INVALID_TOOL_INPUT in (call.input as Record<string, unknown>)
  ) {
    return errorResult(
      call,
      JSON.stringify({
        INVALID_JSON: "A entrada não era um JSON válido. Envie de novo.",
      }),
    );
  }

  const parsed = entry.parse(call.input);

  if (!parsed.ok) {
    return errorResult(call, JSON.stringify({ INVALID_INPUT: parsed.error }));
  }

  try {
    const result = await entry.run(parsed.value, call);
    return {
      type: "tool_result",
      toolCallId: call.id,
      content: JSON.stringify(compactToolResult(result)),
    };
  } catch {
    return errorResult(call, "Não foi possível ler esses dados agora.");
  }
}
