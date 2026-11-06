import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import {
  type AssistantProvider,
  AssistantProviderError,
  type ChatMessage,
  type ChatPart,
  type ProviderStopReason,
  type ProviderTurn,
  type ProviderTurnRequest,
} from "@/lib/assistant/providers/contract";

export const ANTHROPIC_PROVIDER_ID = "anthropic";
export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5-5";

function toAnthropicMessage(
  message: ChatMessage,
): Anthropic.Beta.BetaMessageParam {
  if (
    message.role === "assistant" &&
    message.native?.provider === ANTHROPIC_PROVIDER_ID
  ) {
    // Blocos de raciocínio precisam voltar exatamente como vieram.
    return {
      role: "assistant",
      content: message.native.message as Anthropic.Beta.BetaContentBlockParam[],
    };
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = message.parts.map(
    (part) => {
      if (part.type === "text") return { type: "text", text: part.text };
      if (part.type === "tool_call") {
        return {
          type: "tool_use",
          id: part.id,
          name: part.name,
          input: (part.input ?? {}) as Record<string, unknown>,
        };
      }
      return {
        type: "tool_result",
        tool_use_id: part.toolCallId,
        content: part.content,
        is_error: part.isError || undefined,
      };
    },
  );

  return { role: message.role, content };
}

function fromAnthropicContent(
  content: Anthropic.Beta.BetaContentBlock[],
): ChatPart[] {
  return content.flatMap((block): ChatPart[] => {
    if (block.type === "text") return [{ type: "text", text: block.text }];
    if (block.type === "tool_use") {
      return [
        {
          type: "tool_call",
          id: block.id,
          name: block.name,
          input: block.input,
        },
      ];
    }
    return [];
  });
}

const stopReasons: Record<string, ProviderStopReason> = {
  end_turn: "end",
  stop_sequence: "end",
  tool_use: "tool_use",
  max_tokens: "max_tokens",
  refusal: "refusal",
  pause_turn: "pause",
};

function toProviderError(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AssistantProviderError("auth", "Chave recusada.", error);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AssistantProviderError("rate_limit", "Limite de uso.", error);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AssistantProviderError("connection", "Sem conexão.", error);
  }
  if (error instanceof Anthropic.APIError) {
    return new AssistantProviderError("api", "Erro da API.", error);
  }
  // O SDK rejeita finalMessage quando a entrada de uma ferramenta não é JSON.
  return new AssistantProviderError(
    "invalid_output",
    "Resposta inválida.",
    error,
  );
}

/**
 * Claude pela API da Anthropic: streaming, esforço médio, fallback do
 * servidor em caso de recusa e cache de prompt automático.
 */
export function createAnthropicProvider({
  apiKey,
  model = ANTHROPIC_DEFAULT_MODEL,
  client = new Anthropic({ apiKey }),
}: {
  apiKey: string;
  model?: string;
  client?: Anthropic;
}): AssistantProvider {
  return {
    id: ANTHROPIC_PROVIDER_ID,
    label: "Claude",
    model,

    async streamTurn(request: ProviderTurnRequest): Promise<ProviderTurn> {
      try {
        const stream = client.beta.messages.stream({
          model,
          max_tokens: 64000,
          output_config: { effort: "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          cache_control: { type: "ephemeral" },
          system: request.system.map((text) => ({ type: "text", text })),
          tools: request.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema:
              tool.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
            eager_input_streaming: true,
          })),
          messages: request.messages.map(toAnthropicMessage),
        });

        stream.on("text", (delta) => request.onText(delta));
        const message = await stream.finalMessage();

        return {
          stopReason: stopReasons[message.stop_reason ?? ""] ?? "end",
          message: {
            role: "assistant",
            parts: fromAnthropicContent(message.content),
            native: {
              provider: ANTHROPIC_PROVIDER_ID,
              model,
              message: message.content,
            },
          },
        };
      } catch (error) {
        throw toProviderError(error);
      }
    },

    async validate() {
      try {
        await client.models.retrieve(model);
      } catch (error) {
        throw toProviderError(error);
      }
    },
  };
}
