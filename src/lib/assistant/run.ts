import "server-only";

import {
  assistantContextBlock,
  assistantSystemPrompt,
} from "@/lib/assistant/prompt";
import {
  type AssistantProvider,
  AssistantProviderError,
  type ChatMessage,
  toolCalls,
} from "@/lib/assistant/providers/contract";
import {
  getAssistantToolLabel,
  getAssistantTools,
  runAssistantTool,
} from "@/lib/assistant/tools";
import type { ProposalView } from "@/lib/proposals";

const MAX_TOOL_ROUNDS = 8;
const MAX_INVALID_OUTPUT_RETRIES = 2;

export type AssistantEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string }
  | { type: "proposal"; proposal: ProposalView }
  /** Valores do texto final que não aparecem nos dados da conversa. */
  | { type: "checked"; unverified: string[] }
  | { type: "done" }
  | { type: "error"; message: string };

export function describeAssistantError(
  error: unknown,
  providerLabel = "o modelo",
) {
  if (error instanceof AssistantProviderError) {
    switch (error.kind) {
      case "auth":
        return `A chave de ${providerLabel} foi recusada. Confira na tela do Tito.`;
      case "rate_limit":
        return "Muitas perguntas seguidas. Espere um pouquinho e tente de novo.";
      case "connection":
        return `Não consegui falar com ${providerLabel}. Verifique a conexão do servidor.`;
      case "invalid_output":
        return "A resposta veio truncada. Tente de novo.";
      default:
        return `${providerLabel} não conseguiu responder agora. Tente de novo em instantes.`;
    }
  }
  return "Algo deu errado ao responder. Tente de novo.";
}

/**
 * Um turno do assistente, igual para qualquer provider: chama o modelo em
 * streaming, roda as ferramentas pedidas e repete até ele terminar. Devolve
 * as mensagens novas para acrescentar ao histórico — sempre no fim, sem
 * editar nada antigo.
 */
export async function runAssistantTurn({
  provider,
  history,
  onEvent,
  now = new Date(),
  extraSystem,
  onToolResult,
}: {
  provider: AssistantProvider;
  /** Histórico completo, terminando na mensagem nova do usuário. */
  history: ChatMessage[];
  onEvent: (event: AssistantEvent) => void;
  now?: Date;
  /** Instruções de um agente personalizado, depois do prompt principal. */
  extraSystem?: string | null;
  /** Para quem quer reagir a resultados (ex.: publicar propostas). */
  onToolResult?: (name: string, content: string) => void;
}): Promise<ChatMessage[]> {
  const added: ChatMessage[] = [];
  const tools = getAssistantTools();
  const system = [
    assistantSystemPrompt,
    ...(extraSystem ? [`Instruções deste agente:\n${extraSystem}`] : []),
    assistantContextBlock(now),
  ];
  let retries = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    let turn: Awaited<ReturnType<AssistantProvider["streamTurn"]>>;
    try {
      turn = await provider.streamTurn({
        system,
        messages: [...history, ...added],
        tools,
        onText: (delta) => onEvent({ type: "text", text: delta }),
      });
      retries = 0;
    } catch (error) {
      // Só saída inválida (JSON quebrado) é repetida; o resto sobe.
      if (
        error instanceof AssistantProviderError &&
        error.kind === "invalid_output" &&
        retries < MAX_INVALID_OUTPUT_RETRIES
      ) {
        retries += 1;
        round -= 1;
        continue;
      }
      throw error;
    }

    if (turn.stopReason === "refusal") {
      onEvent({
        type: "error",
        message:
          "Prefiro não responder a isso. Que tal perguntar de outro jeito?",
      });
      return added;
    }

    const calls = toolCalls(turn.message);

    // Entrada de ferramenta cortada no limite de tokens: não roda.
    if (turn.stopReason === "max_tokens" && calls.length > 0) {
      throw new AssistantProviderError("invalid_output", "Entrada truncada.");
    }

    added.push(turn.message);

    if (turn.stopReason === "pause") continue;
    if (calls.length === 0) return added;

    for (const call of calls) {
      onEvent({
        type: "tool",
        name: call.name,
        label: getAssistantToolLabel(call.name),
      });
    }
    const results = await Promise.all(
      calls.map((call) => runAssistantTool(call)),
    );
    results.forEach((result, index) => {
      if (!result.isError) onToolResult?.(calls[index].name, result.content);
    });
    added.push({ role: "user", parts: results });
  }

  onEvent({
    type: "error",
    message: "Essa pergunta deu muitas voltas. Tente algo mais específico.",
  });
  return added;
}
