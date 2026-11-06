import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  assistantContextBlock,
  assistantSystemPrompt,
} from "@/lib/assistant/prompt";
import {
  getAssistantToolLabel,
  getAssistantTools,
  runAssistantTool,
} from "@/lib/assistant/tools";

export const ASSISTANT_MODEL = "claude-opus-5-5";

const MAX_TOOL_ROUNDS = 8;
const MAX_JSON_RETRIES = 2;

export type AssistantEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function describeAssistantError(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return "A chave da API da Anthropic foi recusada. Confira em Assistente → Configurar.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Muitas perguntas seguidas. Espere um pouquinho e tente de novo.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Não consegui falar com a Anthropic. Verifique a conexão do servidor.";
  }
  if (error instanceof Anthropic.APIError) {
    return "A Anthropic não conseguiu responder agora. Tente de novo em instantes.";
  }
  return "Algo deu errado ao responder. Tente de novo.";
}

/**
 * Um turno do assistente: chama o modelo em streaming, roda as ferramentas
 * pedidas e repete até ele terminar. Devolve as mensagens novas (respostas e
 * resultados de ferramentas) para serem acrescentadas ao histórico, sempre
 * no fim e sem editar nada antigo.
 */
export async function runAssistantTurn({
  client,
  history,
  onEvent,
  now = new Date(),
  extraSystem,
}: {
  client: Anthropic;
  /** Histórico completo, terminando na mensagem nova do usuário. */
  history: Anthropic.Beta.BetaMessageParam[];
  onEvent: (event: AssistantEvent) => void;
  now?: Date;
  /** Instruções de um agente personalizado, depois do prompt principal. */
  extraSystem?: string | null;
}): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const added: Anthropic.Beta.BetaMessageParam[] = [];
  const tools = getAssistantTools();
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: assistantSystemPrompt },
    ...(extraSystem
      ? [
          {
            type: "text" as const,
            text: `Instruções deste agente:\n${extraSystem}`,
          },
        ]
      : []),
    { type: "text", text: assistantContextBlock(now) },
  ];
  let jsonRetries = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const stream = client.beta.messages.stream({
      model: ASSISTANT_MODEL,
      max_tokens: 64000,
      output_config: { effort: "medium" },
      // Se o modelo principal recusar, a API tenta de novo num modelo de
      // reserva escolhido pela categoria da recusa, na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system,
      tools,
      messages: [...history, ...added],
    });

    stream.on("text", (delta) => onEvent({ type: "text", text: delta }));

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (error) {
      // Só o JSON de entrada de ferramenta quebrado é repetido; erros da API sobem.
      if (
        error instanceof Anthropic.APIError ||
        jsonRetries >= MAX_JSON_RETRIES
      ) {
        throw error;
      }
      jsonRetries += 1;
      round -= 1;
      continue;
    }

    if (message.stop_reason === "refusal") {
      onEvent({
        type: "error",
        message:
          "Prefiro não responder a isso. Que tal perguntar de outro jeito?",
      });
      return added;
    }

    const toolUses = message.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use",
    );

    if (message.stop_reason === "max_tokens" && toolUses.length > 0) {
      throw new Error("tool input truncated by max_tokens");
    }

    added.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") continue;
    if (toolUses.length === 0) return added;

    for (const block of toolUses) {
      onEvent({
        type: "tool",
        name: block.name,
        label: getAssistantToolLabel(block.name),
      });
    }
    const results = await Promise.all(
      toolUses.map((block) => runAssistantTool(block)),
    );
    added.push({ role: "user", content: results });
  }

  onEvent({
    type: "error",
    message: "Essa pergunta deu muitas voltas. Tente algo mais específico.",
  });
  return added;
}
