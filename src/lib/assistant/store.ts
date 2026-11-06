import "server-only";

import {
  decodeStoredMessage,
  encodeStoredMessage,
} from "@/lib/assistant/history";
import { createAssistantProvider } from "@/lib/assistant/providers";
import type {
  AssistantProvider,
  ChatMessage,
} from "@/lib/assistant/providers/contract";
import {
  type AssistantProviderSettings,
  isAssistantProviderId,
} from "@/lib/assistant/providers/options";
import { conversationTitle } from "@/lib/assistant/transcript";
import { prisma } from "@/lib/prisma";

/**
 * Configuração do modelo do Tito: o que foi salvo no app ou, sem isso, as
 * variáveis do servidor (ASSISTANT_PROVIDER, ANTHROPIC_API_KEY,
 * DEEPSEEK_API_KEY, ASSISTANT_API_KEY, ASSISTANT_BASE_URL, ASSISTANT_MODEL).
 */
export async function getAssistantProviderSettings(): Promise<
  AssistantProviderSettings & { savedInApp: boolean }
> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: {
      anthropicApiKey: true,
      assistantProvider: true,
      assistantApiKey: true,
      assistantBaseUrl: true,
      assistantModel: true,
    },
  });
  const env = process.env;
  const provider = isAssistantProviderId(settings?.assistantProvider)
    ? settings.assistantProvider
    : isAssistantProviderId(env.ASSISTANT_PROVIDER)
      ? env.ASSISTANT_PROVIDER
      : "anthropic";

  if (provider === "anthropic") {
    return {
      provider,
      apiKey: settings?.anthropicApiKey || env.ANTHROPIC_API_KEY || null,
      baseUrl: null,
      model: settings?.assistantModel || env.ASSISTANT_MODEL || null,
      savedInApp: Boolean(settings?.anthropicApiKey),
    };
  }

  return {
    provider,
    apiKey:
      settings?.assistantApiKey ||
      (provider === "deepseek" ? env.DEEPSEEK_API_KEY : undefined) ||
      env.ASSISTANT_API_KEY ||
      null,
    baseUrl: settings?.assistantBaseUrl || env.ASSISTANT_BASE_URL || null,
    model: settings?.assistantModel || env.ASSISTANT_MODEL || null,
    savedInApp: Boolean(settings?.assistantApiKey),
  };
}

/** O provider pronto para uso, ou null se o Tito não estiver configurado. */
export async function getAssistantProvider(): Promise<AssistantProvider | null> {
  return createAssistantProvider(await getAssistantProviderSettings());
}

const conversationSelect = {
  id: true,
  title: true,
  agent: { select: { id: true, name: true, instructions: true } },
} as const;

/** Nova conversa, opcionalmente presa a um agente (que precisa existir). */
export async function createConversation(
  question: string,
  agentId: string | null = null,
) {
  const agent = agentId
    ? await prisma.assistantAgent.findUnique({
        where: { id: agentId },
        select: { id: true },
      })
    : null;

  return prisma.assistantConversation.create({
    data: { title: conversationTitle(question), agentId: agent?.id ?? null },
    select: conversationSelect,
  });
}

export async function findConversation(id: string) {
  return prisma.assistantConversation.findUnique({
    where: { id },
    select: conversationSelect,
  });
}

/** Acrescenta mensagens no fim, na ordem. Nunca reescreve as anteriores. */
export async function appendConversationMessages(
  conversationId: string,
  messages: readonly ChatMessage[],
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
          content: encodeStoredMessage(message),
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
): Promise<ChatMessage[]> {
  const rows = await prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  return rows.map((row) => decodeStoredMessage(row.role, row.content));
}

export async function listConversations(limit = 30) {
  return prisma.assistantConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true },
  });
}
