import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { conversationTitle } from "@/lib/assistant/transcript";
import { prisma } from "@/lib/prisma";

/** Chave salva no app; sem ela, a variável ANTHROPIC_API_KEY do servidor. */
export async function getAnthropicApiKey(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { anthropicApiKey: true },
  });

  return settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

export async function createConversation(question: string) {
  return prisma.assistantConversation.create({
    data: { title: conversationTitle(question) },
    select: { id: true, title: true },
  });
}

export async function findConversation(id: string) {
  return prisma.assistantConversation.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
}

/** Acrescenta mensagens no fim, na ordem. Nunca reescreve as anteriores. */
export async function appendConversationMessages(
  conversationId: string,
  messages: readonly Anthropic.Beta.BetaMessageParam[],
) {
  if (messages.length === 0) return;

  // createdAt crescente garante a ordem mesmo dentro do mesmo milissegundo.
  const base = Date.now();
  await prisma.$transaction([
    ...messages.map((message, index) =>
      prisma.assistantMessage.create({
        data: {
          conversationId,
          role: message.role,
          content: JSON.stringify(message.content),
          createdAt: new Date(base + index),
        },
      }),
    ),
    prisma.assistantConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date(base + messages.length) },
    }),
  ]);
}

export async function loadConversationHistory(
  conversationId: string,
): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const rows = await prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  return rows.map((row) => ({
    role: row.role === "assistant" ? "assistant" : "user",
    content: JSON.parse(row.content),
  }));
}

export async function listConversations(limit = 30) {
  return prisma.assistantConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true },
  });
}
