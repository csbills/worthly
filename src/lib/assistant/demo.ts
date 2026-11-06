import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import type { AssistantEvent } from "@/lib/assistant/run";
import { runAssistantTool } from "@/lib/assistant/tools";

type Emit = (event: AssistantEvent) => void;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

async function readTool(name: string): Promise<Record<string, unknown>> {
  const result = await runAssistantTool({
    type: "tool_use",
    id: `demo_${name}`,
    name,
    input: {},
    caller: { type: "direct" },
  } as Anthropic.Beta.BetaToolUseBlock);

  try {
    return typeof result.content === "string" && !result.is_error
      ? JSON.parse(result.content)
      : {};
  } catch {
    return {};
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Solta o texto aos poucos, como o streaming de verdade. */
async function streamText(
  text: string,
  onEvent: Emit,
): Promise<Anthropic.Beta.BetaMessageParam[]> {
  for (const chunk of text.match(/[\s\S]{1,24}(\s|$)/g) ?? [text]) {
    onEvent({ type: "text", text: chunk });
    await pause(25);
  }

  return [{ role: "assistant", content: [{ type: "text", text }] }];
}

const planQuestion =
  /plano|meta|independ|liberdade|reserva|aposent|guardar|poupar/i;

/** Perguntas de planejamento recebem os passos do plano real da casa. */
async function runDemoPlanTurn(onEvent: Emit) {
  onEvent({
    type: "tool",
    name: "get_financial_plan",
    label: "Montando o plano da casa",
  });
  const result = await readTool("get_financial_plan");
  const plan = result.plan as
    | { steps?: { title: string; detail: string }[] }
    | undefined;
  const steps = plan?.steps ?? [];

  return streamText(
    [
      "Estou no **modo demo**, sem IA, mas o plano abaixo usa os números reais desta casa:",
      "",
      ...steps.map(
        (step, index) => `${index + 1}. **${step.title}** — ${step.detail}`,
      ),
      "",
      "Os cenários, os compromissos e as metas sugeridas estão em Planejar → Meu plano.",
    ].join("\n"),
    onEvent,
  );
}

/**
 * Sem chave da Anthropic, no modo demo, o Tito responde com um resumo montado
 * a partir das mesmas ferramentas — só para mostrar a conversa funcionando.
 */
export async function runDemoAssistantTurn({
  onEvent,
  question = "",
}: {
  onEvent: Emit;
  question?: string;
}): Promise<Anthropic.Beta.BetaMessageParam[]> {
  if (planQuestion.test(question)) return runDemoPlanTurn(onEvent);

  onEvent({
    type: "tool",
    name: "get_overview",
    label: "Olhando o panorama do mês",
  });
  const overview = await readTool("get_overview");
  onEvent({
    type: "tool",
    name: "get_spending_by_category",
    label: "Somando gastos por categoria",
  });
  const spending = await readTool("get_spending_by_category");

  const groups = Array.isArray(spending.groups)
    ? (spending.groups as { label: string; amount: number }[]).slice(0, 3)
    : [];
  const total = typeof spending.total === "number" ? spending.total : 0;
  const cashFlow = (overview.cashFlow as { current?: { balance?: number } })
    ?.current;

  const lines = [
    "Estou no **modo demo**, então respondo com um resumo pronto, sem IA. Configure uma chave da Anthropic para conversar de verdade. 🙂",
    "",
    `Este mês você gastou **${formatCurrency(total)}**. As maiores categorias:`,
    "",
    ...groups.map(
      (group) => `- ${group.label}: ${formatCurrency(group.amount)}`,
    ),
  ];

  if (typeof cashFlow?.balance === "number") {
    lines.push(
      "",
      `Saldo do mês até agora: **${formatCurrency(cashFlow.balance)}**.`,
    );
  }

  return streamText(lines.join("\n"), onEvent);
}
