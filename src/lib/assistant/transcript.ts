/**
 * Converte o histórico (com chamadas e resultados de ferramenta) no que a
 * tela mostra: falas do usuário e do Tito, quais dados ele consultou, as
 * propostas que ele fez e os valores do texto que não vieram dos dados.
 */

import {
  collectEvidenceNumbers,
  findUnverifiedAmounts,
} from "@/lib/assistant/grounding";
import type { ChatMessage } from "@/lib/assistant/providers/contract";

export type TranscriptEntry = {
  role: "user" | "assistant";
  text: string;
  /** Nomes das ferramentas usadas nesta resposta. */
  tools: string[];
  /** Propostas (cartões de confirmação) criadas nesta resposta. */
  proposalIds: string[];
  /** Valores em R$ do texto que não aparecem em nenhum dado da conversa. */
  unverified: string[];
};

function textOf(message: ChatMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim();
}

export function proposalIdFromToolResult(content: string) {
  try {
    const parsed = JSON.parse(content) as { proposalId?: unknown };
    return typeof parsed.proposalId === "string" ? parsed.proposalId : null;
  } catch {
    return null;
  }
}

export function toTranscript(
  messages: readonly ChatMessage[],
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const toolResults: string[] = [];
  const userTexts: string[] = [];
  const toolNames = new Map<string, string>();

  for (const message of messages) {
    if (message.role === "user") {
      for (const part of message.parts) {
        if (part.type !== "tool_result") continue;
        toolResults.push(part.content);
        const previous = entries.at(-1);
        if (
          toolNames.get(part.toolCallId) === "propose_goals" &&
          !part.isError &&
          previous?.role === "assistant"
        ) {
          const id = proposalIdFromToolResult(part.content);
          if (id) previous.proposalIds.push(id);
        }
      }
      const text = textOf(message);
      if (text) {
        userTexts.push(text);
        entries.push({
          role: "user",
          text,
          tools: [],
          proposalIds: [],
          unverified: [],
        });
      }
      continue;
    }

    const text = textOf(message);
    const tools: string[] = [];
    for (const part of message.parts) {
      if (part.type === "tool_call") {
        tools.push(part.name);
        toolNames.set(part.id, part.name);
      }
    }
    const previous = entries.at(-1);

    if (previous?.role === "assistant") {
      previous.text = [previous.text, text].filter(Boolean).join("\n\n");
      previous.tools.push(...tools);
    } else {
      entries.push({
        role: "assistant",
        text,
        tools,
        proposalIds: [],
        unverified: [],
      });
    }
  }

  // A checagem usa tudo o que a conversa conhecia.
  const evidence = collectEvidenceNumbers({ toolResults, userTexts });
  for (const entry of entries) {
    if (entry.role === "assistant" && entry.text) {
      entry.unverified = findUnverifiedAmounts(entry.text, evidence);
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
