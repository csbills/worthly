"use server";

import { revalidatePath } from "next/cache";

import { getProposals } from "@/actions/goal-proposals";
import { createAssistantProvider } from "@/lib/assistant/providers";
import { AssistantProviderError } from "@/lib/assistant/providers/contract";
import {
  type AssistantProviderId,
  getAssistantProviderOption,
  isAssistantProviderId,
} from "@/lib/assistant/providers/options";
import {
  getAssistantProviderSettings,
  listConversations,
  loadConversationHistory,
} from "@/lib/assistant/store";
import { type TranscriptEntry, toTranscript } from "@/lib/assistant/transcript";
import { verifySession } from "@/lib/auth/dal";
import { isDemoMode } from "@/lib/demo/pluggy-demo-client";
import { prisma } from "@/lib/prisma";
import type { ProposalView } from "@/lib/proposals";

export type AssistantState = {
  /** Há um provider com chave (no app ou nas variáveis do servidor). */
  configured: boolean;
  /** Sem provider, mas o modo demo responde com um resumo pronto. */
  demo: boolean;
  /** A chave foi salva pelo app (pode ser removida por aqui). */
  keySavedInApp: boolean;
  provider: AssistantProviderId;
  providerLabel: string;
  model: string | null;
  baseUrl: string | null;
  conversations: { id: string; title: string; updatedAt: string }[];
};

export type AssistantKeyFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type TranscriptEntryView = TranscriptEntry & {
  proposals: ProposalView[];
};

export async function getAssistantState(): Promise<AssistantState> {
  await verifySession();

  const [settings, conversations] = await Promise.all([
    getAssistantProviderSettings(),
    listConversations(),
  ]);
  const provider = createAssistantProvider(settings);
  const option = getAssistantProviderOption(settings.provider);

  return {
    configured: Boolean(provider),
    demo: !provider && isDemoMode(),
    keySavedInApp: settings.savedInApp,
    provider: settings.provider,
    providerLabel: option.label,
    model: provider?.model ?? settings.model ?? option.defaultModel,
    baseUrl: settings.baseUrl ?? option.defaultBaseUrl,
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
  entries: TranscriptEntryView[];
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

  const entries = toTranscript(await loadConversationHistory(conversation.id));
  const proposals = new Map(
    (await getProposals(entries.flatMap((entry) => entry.proposalIds))).map(
      (proposal) => [proposal.id, proposal],
    ),
  );

  return {
    ...conversation,
    entries: entries.map((entry) => ({
      ...entry,
      proposals: entry.proposalIds.flatMap((id) => {
        const proposal = proposals.get(id);
        return proposal ? [proposal] : [];
      }),
    })),
  };
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Salva o modelo do Tito. A chave é validada com uma chamada barata antes de
 * ser guardada; deixar a chave em branco mantém a que já estava salva para
 * o mesmo provider (útil para trocar só o modelo).
 */
export async function saveAssistantProvider(
  _previous: AssistantKeyFormState,
  formData: FormData,
): Promise<AssistantKeyFormState> {
  await verifySession();

  const rawProvider = field(formData, "provider");
  if (!isAssistantProviderId(rawProvider)) {
    return { status: "error", message: "Escolha um provider." };
  }
  const option = getAssistantProviderOption(rawProvider);
  const current = await getAssistantProviderSettings();
  const apiKey =
    field(formData, "apiKey") ||
    (current.provider === rawProvider && current.savedInApp
      ? (current.apiKey ?? "")
      : "");
  const baseUrl = field(formData, "baseUrl") || option.defaultBaseUrl || "";
  const model = field(formData, "model") || option.defaultModel || "";

  if (!apiKey) return { status: "error", message: "Cole a chave da API." };
  if (!baseUrl && rawProvider !== "anthropic") {
    return { status: "error", message: "Informe o endereço da API." };
  }
  if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
    return {
      status: "error",
      message: "O endereço precisa começar com https://.",
    };
  }
  if (!model) return { status: "error", message: "Informe o modelo." };

  const provider = createAssistantProvider({
    provider: rawProvider,
    apiKey,
    baseUrl: baseUrl || null,
    model,
  });
  if (!provider)
    return { status: "error", message: "Configuração incompleta." };

  try {
    await provider.validate();
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof AssistantProviderError && error.kind === "auth"
          ? `${option.label} recusou essa chave. Copie de novo no painel do provider.`
          : "Não consegui validar agora. Confira o endereço e tente de novo.",
    };
  }

  const data =
    rawProvider === "anthropic"
      ? {
          assistantProvider: rawProvider,
          anthropicApiKey: apiKey,
          assistantModel: model === option.defaultModel ? null : model,
        }
      : {
          assistantProvider: rawProvider,
          assistantApiKey: apiKey,
          assistantBaseUrl: baseUrl,
          assistantModel: model,
        };

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  revalidatePath("/assistant");

  return {
    status: "success",
    message: `${option.label} conectado. O Tito está pronto!`,
  };
}

/** Apaga a chave salva no app (as variáveis do servidor continuam valendo). */
export async function removeAssistantKey() {
  await verifySession();

  await prisma.appSettings.updateMany({
    where: { id: "default" },
    data: { anthropicApiKey: null, assistantApiKey: null },
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
