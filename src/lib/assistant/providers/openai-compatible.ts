import {
  type AssistantProvider,
  AssistantProviderError,
  type ChatMessage,
  type ChatPart,
  INVALID_TOOL_INPUT,
  type ProviderStopReason,
  type ProviderTurn,
  type ProviderTurnRequest,
  type ToolSpec,
} from "@/lib/assistant/providers/contract";

/**
 * Qualquer API no formato Chat Completions da OpenAI: DeepSeek, OpenAI,
 * OpenRouter, Groq, Ollama… Só fetch, sem SDK de terceiros.
 */

type WireToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type WireMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "tool"; tool_call_id: string; content: string }
  | {
      role: "assistant";
      content: string | null;
      reasoning_content?: string;
      tool_calls?: WireToolCall[];
    };

export type OpenAICompatibleConfig = {
  /** Gravado no histórico: "deepseek", "openai-compatible"… */
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Campos extras do provider (ex.: { reasoning_effort: "high" }). */
  extraBody?: Record<string, unknown>;
  fetch?: typeof fetch;
};

export function toWireMessages(
  system: readonly string[],
  messages: readonly ChatMessage[],
  providerId: string,
): WireMessage[] {
  const wire: WireMessage[] = [];
  if (system.length)
    wire.push({ role: "system", content: system.join("\n\n") });

  for (const message of messages) {
    if (message.role === "assistant") {
      // Quem gerou a mensagem recebe de volta o original (o DeepSeek exige o
      // reasoning_content em toda chamada com ferramentas).
      if (message.native?.provider === providerId) {
        wire.push(message.native.message as WireMessage);
        continue;
      }
      const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as { text: string }).text)
        .join("\n\n");
      const calls = message.parts.flatMap((part) =>
        part.type === "tool_call"
          ? [
              {
                id: part.id,
                type: "function" as const,
                function: {
                  name: part.name,
                  arguments: JSON.stringify(part.input ?? {}),
                },
              },
            ]
          : [],
      );
      wire.push({
        role: "assistant",
        content: text || null,
        ...(calls.length ? { tool_calls: calls } : {}),
      });
      continue;
    }

    for (const part of message.parts) {
      if (part.type === "tool_result") {
        wire.push({
          role: "tool",
          tool_call_id: part.toolCallId,
          content: part.content,
        });
      }
    }
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text)
      .join("\n\n");
    if (text) wire.push({ role: "user", content: text });
  }

  return wire;
}

export function toWireTools(tools: readonly ToolSpec[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

type StreamChunk = {
  choices?: {
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      tool_calls?: {
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
    finish_reason?: string | null;
  }[];
};

/** Junta os pedaços do streaming numa mensagem completa. */
export class ChatCompletionAccumulator {
  content = "";
  reasoning = "";
  finishReason: string | null = null;
  private calls = new Map<
    number,
    { id: string; name: string; arguments: string }
  >();

  push(chunk: StreamChunk, onText?: (delta: string) => void) {
    const choice = chunk.choices?.[0];
    if (!choice) return;
    const delta = choice.delta ?? {};

    if (delta.content) {
      this.content += delta.content;
      onText?.(delta.content);
    }
    if (delta.reasoning_content) this.reasoning += delta.reasoning_content;
    for (const call of delta.tool_calls ?? []) {
      const current = this.calls.get(call.index) ?? {
        id: "",
        name: "",
        arguments: "",
      };
      if (call.id) current.id = call.id;
      if (call.function?.name) current.name += call.function.name;
      if (call.function?.arguments)
        current.arguments += call.function.arguments;
      this.calls.set(call.index, current);
    }
    if (choice.finish_reason) this.finishReason = choice.finish_reason;
  }

  toolCalls(): WireToolCall[] {
    return [...this.calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, call]) => ({
        id: call.id || `call_${index}`,
        type: "function",
        function: { name: call.name, arguments: call.arguments || "{}" },
      }));
  }
}

const stopReasons: Record<string, ProviderStopReason> = {
  stop: "end",
  tool_calls: "tool_use",
  length: "max_tokens",
  content_filter: "refusal",
};

function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { [INVALID_TOOL_INPUT]: raw };
  }
}

/** Lê um corpo SSE ("data: {...}" … "data: [DONE]") chamando onChunk. */
export async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: StreamChunk) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");

    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        onChunk(JSON.parse(payload) as StreamChunk);
      } catch {
        // Linha de keep-alive ou comentário: ignora.
      }
    }
    if (done) return;
  }
}

function errorForStatus(status: number, detail: string) {
  if (status === 401 || status === 403) {
    return new AssistantProviderError("auth", `Chave recusada (${status}).`);
  }
  if (status === 429) {
    return new AssistantProviderError("rate_limit", "Limite de uso.");
  }
  return new AssistantProviderError(
    "api",
    `Erro ${status}: ${detail.slice(0, 200)}`,
  );
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): AssistantProvider {
  const doFetch = config.fetch ?? fetch;
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  return {
    id: config.id,
    label: config.label,
    model: config.model,

    async streamTurn(request: ProviderTurnRequest): Promise<ProviderTurn> {
      let response: Response;
      try {
        response = await doFetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: config.model,
            messages: toWireMessages(
              request.system,
              request.messages,
              config.id,
            ),
            ...(request.tools.length
              ? { tools: toWireTools(request.tools) }
              : {}),
            stream: true,
            ...config.extraBody,
          }),
        });
      } catch (error) {
        throw new AssistantProviderError("connection", "Sem conexão.", error);
      }

      if (!response.ok || !response.body) {
        throw errorForStatus(
          response.status,
          await response.text().catch(() => ""),
        );
      }

      const accumulator = new ChatCompletionAccumulator();
      await readEventStream(response.body, (chunk) =>
        accumulator.push(chunk, request.onText),
      );

      const reason = accumulator.finishReason ?? "stop";
      if (!(reason in stopReasons)) {
        throw new AssistantProviderError(
          "api",
          `Resposta interrompida (${reason}).`,
        );
      }

      const calls = accumulator.toolCalls();
      const parts: ChatPart[] = [
        ...(accumulator.content
          ? [{ type: "text" as const, text: accumulator.content }]
          : []),
        ...calls.map((call) => ({
          type: "tool_call" as const,
          id: call.id,
          name: call.function.name,
          input: parseArguments(call.function.arguments),
        })),
      ];
      const native: WireMessage = {
        role: "assistant",
        content: accumulator.content || null,
        ...(accumulator.reasoning
          ? { reasoning_content: accumulator.reasoning }
          : {}),
        ...(calls.length ? { tool_calls: calls } : {}),
      };

      return {
        stopReason:
          calls.length && reason === "stop" ? "tool_use" : stopReasons[reason],
        message: {
          role: "assistant",
          parts,
          native: { provider: config.id, model: config.model, message: native },
        },
      };
    },

    async validate() {
      let response: Response;
      try {
        response = await doFetch(`${baseUrl}/models`, { headers });
      } catch (error) {
        throw new AssistantProviderError("connection", "Sem conexão.", error);
      }
      if (!response.ok) {
        throw errorForStatus(
          response.status,
          await response.text().catch(() => ""),
        );
      }
    },
  };
}
