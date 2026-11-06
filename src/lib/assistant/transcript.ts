/**
 * Converte o histórico da API (com blocos de ferramenta e raciocínio) no que
 * a tela mostra: falas do usuário e do Tito, e quais dados ele consultou.
 */

export type StoredAssistantMessage = {
  role: string;
  content?: unknown;
};

export type TranscriptEntry = {
  role: "user" | "assistant";
  text: string;
  /** Nomes das ferramentas usadas nesta resposta. */
  tools: string[];
};

type Block = { type?: unknown; text?: unknown; name?: unknown };

function blocksOf(content: unknown): Block[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? (content as Block[]) : [];
}

function textOf(blocks: Block[]) {
  return blocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n\n")
    .trim();
}

export function toTranscript(
  messages: readonly StoredAssistantMessage[],
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];

  for (const message of messages) {
    const blocks = blocksOf(message.content);

    if (message.role === "user") {
      // Mensagens só com resultados de ferramenta não são falas do usuário.
      if (blocks.every((block) => block.type === "tool_result")) continue;
      entries.push({ role: "user", text: textOf(blocks), tools: [] });
      continue;
    }

    if (message.role !== "assistant") continue;

    const text = textOf(blocks);
    const tools = blocks
      .filter(
        (block) => block.type === "tool_use" && typeof block.name === "string",
      )
      .map((block) => block.name as string);
    const previous = entries.at(-1);

    if (previous?.role === "assistant") {
      previous.text = [previous.text, text].filter(Boolean).join("\n\n");
      previous.tools.push(...tools);
    } else {
      entries.push({ role: "assistant", text, tools });
    }
  }

  return entries;
}

/** Título da conversa a partir da primeira pergunta. */
export function conversationTitle(question: string) {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length > 60
    ? `${clean.slice(0, 57).trimEnd()}…`
    : clean || "Nova conversa";
}
