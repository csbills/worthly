/**
 * Contrato entre o Tito e qualquer modelo de linguagem. O resto do app só
 * conhece estes tipos: trocar Claude por DeepSeek (ou outro provider
 * compatível com OpenAI) é trocar o adaptador, não o assistente.
 *
 * Cada mensagem do modelo guarda também a versão nativa do provider que a
 * gerou (`native`). Alguns providers exigem que ela volte intacta nas
 * próximas chamadas — os blocos de raciocínio do Claude e o
 * `reasoning_content` do DeepSeek — e só o próprio adaptador a lê.
 */

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | {
      type: "tool_result";
      toolCallId: string;
      content: string;
      isError?: boolean;
    };

export type NativeMessage = {
  provider: string;
  model: string;
  message: unknown;
};

export type ChatMessage = {
  role: "user" | "assistant";
  parts: ChatPart[];
  native?: NativeMessage;
};

export type ToolSpec = {
  name: string;
  description: string;
  /** JSON Schema do objeto de entrada. */
  inputSchema: Record<string, unknown>;
};

export type ProviderStopReason =
  | "end"
  | "tool_use"
  | "max_tokens"
  | "refusal"
  | "pause";

export type ProviderTurn = {
  message: ChatMessage;
  stopReason: ProviderStopReason;
};

export type ProviderTurnRequest = {
  /** Blocos de instrução, do mais estável ao mais volátil (ajuda o cache). */
  system: string[];
  messages: ChatMessage[];
  tools: ToolSpec[];
  onText: (delta: string) => void;
};

export type ProviderErrorKind =
  | "auth"
  | "rate_limit"
  | "connection"
  | "api"
  /** O modelo devolveu algo que não dá para usar (ex.: JSON quebrado). */
  | "invalid_output";

export class AssistantProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AssistantProviderError";
  }
}

export interface AssistantProvider {
  /** Identificador estável ("anthropic", "deepseek"…), gravado no histórico. */
  readonly id: string;
  /** Nome para a tela ("Claude", "DeepSeek"). */
  readonly label: string;
  readonly model: string;
  /** Um turno do modelo em streaming: texto aos poucos, resposta completa no fim. */
  streamTurn(request: ProviderTurnRequest): Promise<ProviderTurn>;
  /** Confere a chave com uma chamada barata. Lança AssistantProviderError. */
  validate(): Promise<void>;
}

/** Texto de uma mensagem, juntando as partes de texto. */
export function messageText(message: ChatMessage) {
  return message.parts
    .filter(
      (part): part is Extract<ChatPart, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

export function toolCalls(message: ChatMessage) {
  return message.parts.filter(
    (part): part is Extract<ChatPart, { type: "tool_call" }> =>
      part.type === "tool_call",
  );
}

/** Marca de entrada de ferramenta que não era JSON válido. */
export const INVALID_TOOL_INPUT = "__invalid_json";
