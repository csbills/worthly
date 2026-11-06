import type { ChatMessage, ChatPart } from "@/lib/assistant/providers/contract";

/**
 * Como as mensagens do Tito ficam no banco. O formato atual é neutro
 * ({ parts, native }); conversas antigas guardavam o conteúdo da Anthropic
 * direto e são convertidas na leitura, sem migração de dados.
 */

type LegacyBlock = {
  type?: unknown;
  text?: unknown;
  id?: unknown;
  name?: unknown;
  input?: unknown;
  tool_use_id?: unknown;
  content?: unknown;
  is_error?: unknown;
};

function legacyResultText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return (content as LegacyBlock[])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n");
}

function fromLegacyContent(content: unknown): ChatPart[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (!Array.isArray(content)) return [];

  return (content as LegacyBlock[]).flatMap((block): ChatPart[] => {
    if (block.type === "text" && typeof block.text === "string") {
      return [{ type: "text", text: block.text }];
    }
    if (block.type === "tool_use" && typeof block.id === "string") {
      return [
        {
          type: "tool_call",
          id: block.id,
          name: String(block.name ?? ""),
          input: block.input ?? {},
        },
      ];
    }
    if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
      return [
        {
          type: "tool_result",
          toolCallId: block.tool_use_id,
          content: legacyResultText(block.content),
          isError: block.is_error === true || undefined,
        },
      ];
    }
    return [];
  });
}

export function encodeStoredMessage(message: ChatMessage) {
  return JSON.stringify({ parts: message.parts, native: message.native });
}

export function decodeStoredMessage(role: string, raw: string): ChatMessage {
  const normalizedRole = role === "assistant" ? "assistant" : "user";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { role: normalizedRole, parts: [] };
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Array.isArray((parsed as { parts?: unknown }).parts)
  ) {
    const { parts, native } = parsed as Pick<ChatMessage, "parts" | "native">;
    return { role: normalizedRole, parts, ...(native ? { native } : {}) };
  }

  // Formato antigo: conteúdo da Anthropic direto.
  return {
    role: normalizedRole,
    parts: fromLegacyContent(parsed),
    ...(normalizedRole === "assistant" && Array.isArray(parsed)
      ? {
          native: {
            provider: "anthropic",
            model: "claude-opus-5-5",
            message: parsed,
          },
        }
      : {}),
  };
}
