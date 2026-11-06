"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import { ASSISTANT_MODEL } from "@/lib/assistant/run";
import {
  getAnthropicApiKey,
  listConversations,
  loadConversationHistory,
} from "@/lib/assistant/store";
import { type TranscriptEntry, toTranscript } from "@/lib/assistant/transcript";
import { verifySession } from "@/lib/auth/dal";
import { isDemoMode } from "@/lib/demo/pluggy-demo-client";
import { prisma } from "@/lib/prisma";

export type AssistantState = {
  /** Há chave salva ou ANTHROPIC_API_KEY no servidor. */
  configured: boolean;
  /** Sem chave, mas o modo demo responde com um resumo pronto. */
  demo: boolean;
  /** A chave veio do app (pode ser removida por aqui). */
  keySavedInApp: boolean;
  conversations: { id: string; title: string; updatedAt: string }[];
};

export type AssistantKeyFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function getAssistantState(): Promise<AssistantState> {
  await verifySession();

  const [apiKey, settings, conversations] = await Promise.all([
    getAnthropicApiKey(),
    prisma.appSettings.findUnique({
      where: { id: "default" },
      select: { anthropicApiKey: true },
    }),
    listConversations(),
  ]);

  return {
    configured: Boolean(apiKey),
    demo: !apiKey && isDemoMode(),
    keySavedInApp: Boolean(settings?.anthropicApiKey),
    conversations: conversations.map((conversation) => ({
      ...conversation,
      updatedAt: conversation.updatedAt.toISOString(),
    })),
  };
}

export async function getConversationTranscript(
  conversationId: string,
): Promise<{
  id: string;
  title: string;
  agent: { id: string; name: string; emoji: string } | null;
  entries: TranscriptEntry[];
} | null> {
  await verifySession();

  const conversation = await prisma.assistantConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      title: true,
      agent: { select: { id: true, name: true, emoji: true } },
    },
  });

  if (!conversation) return null;

  return {
    ...conversation,
    entries: toTranscript(await loadConversationHistory(conversation.id)),
  };
}

export async function saveAnthropicApiKey(
  _previous: AssistantKeyFormState,
  formData: FormData,
): Promise<AssistantKeyFormState> {
  await verifySession();

  const value = formData.get("apiKey");
  const apiKey = typeof value === "string" ? value.trim() : "";

  if (!apiKey) {
    return { status: "error", message: "Cole a chave da API da Anthropic." };
  }

  try {
    // Uma leitura barata prova que a chave vale antes de guardá-la.
    await new Anthropic({ apiKey }).models.retrieve(ASSISTANT_MODEL);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Anthropic.AuthenticationError
          ? "A Anthropic recusou essa chave. Copie de novo no Console da Anthropic."
          : "Não consegui validar a chave agora. Tente de novo em instantes.",
    };
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", anthropicApiKey: apiKey },
    update: { anthropicApiKey: apiKey },
  });
  revalidatePath("/assistant");

  return { status: "success", message: "Chave validada. O Tito está pronto!" };
}

export async function removeAnthropicApiKey() {
  await verifySession();

  await prisma.appSettings.updateMany({
    where: { id: "default" },
    data: { anthropicApiKey: null },
  });
  revalidatePath("/assistant");
}

export async function deleteConversation(formData: FormData) {
  await verifySession();

  const id = formData.get("conversationId");

  if (typeof id === "string" && id) {
    await prisma.assistantConversation.deleteMany({ where: { id } });
  }
  revalidatePath("/assistant");
}
