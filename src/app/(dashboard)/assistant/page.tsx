import type { Metadata } from "next";
import Link from "next/link";

import {
  deleteConversation,
  getAssistantState,
  getConversationTranscript,
  removeAnthropicApiKey,
} from "@/actions/assistant";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { AssistantKeyForm } from "@/components/assistant/assistant-key-form";
import { Tito } from "@/components/mascot/tito";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { assistantSuggestions } from "@/lib/assistant/prompt";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tito" };

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

function AssistantSetup() {
  return (
    <section className="surface mx-auto w-full max-w-md p-6 text-center sm:p-8">
      <div className="flex justify-center">
        <Tito mood="wave" size="xl" />
      </div>
      <h2 className="mt-4 text-lg font-medium">Conheça o Tito</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        O Tito responde perguntas sobre o seu dinheiro usando um modelo da
        Anthropic. Ele só é ativado com uma chave sua, guardada neste servidor.
      </p>
      <ul className="mt-4 space-y-1.5 text-left text-xs leading-5 text-muted-foreground">
        <li>
          • Ao perguntar, os dados necessários para a resposta (transações,
          saldos, categorias) são enviados à Anthropic.
        </li>
        <li>• Nada é enviado enquanto você não conversa com ele.</li>
        <li>• Ele só lê: não movimenta dinheiro nem altera nada nos bancos.</li>
      </ul>
      <div className="mt-6">
        <AssistantKeyForm />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Crie uma chave em{" "}
        <a
          href="https://platform.claude.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          platform.claude.com
        </a>
        . Também vale definir ANTHROPIC_API_KEY no servidor.
      </p>
    </section>
  );
}

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const { c } = await searchParams;
  const conversationId = typeof c === "string" ? c : null;
  const [state, transcript] = await Promise.all([
    getAssistantState(),
    conversationId ? getConversationTranscript(conversationId) : null,
  ]);
  const ready = state.configured || state.demo;

  return (
    <>
      <PageHeader
        eyebrow="Assistente"
        title={transcript?.title ?? "Converse com o Tito"}
        description={
          transcript
            ? undefined
            : "Perguntas em português, respostas com os números das suas contas."
        }
        actions={
          ready ? (
            <Link
              href="/assistant"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Nova conversa
            </Link>
          ) : null
        }
      />

      {ready ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <AssistantChat
            key={transcript?.id ?? "new"}
            conversationId={transcript?.id ?? null}
            initialEntries={transcript?.entries ?? []}
            suggestions={assistantSuggestions}
            demo={state.demo}
          />

          <aside className="hidden space-y-4 lg:block">
            <div className="surface p-2">
              <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">
                Conversas
              </p>
              {state.conversations.length > 0 ? (
                <ul>
                  {state.conversations.map((conversation) => (
                    <li
                      key={conversation.id}
                      className="group/conv flex items-center"
                    >
                      <Link
                        href={`/assistant?c=${conversation.id}`}
                        className={cn(
                          "min-w-0 flex-1 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted",
                          conversation.id === transcript?.id && "bg-muted",
                        )}
                      >
                        <span className="block truncate">
                          {conversation.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatWhen(conversation.updatedAt)}
                        </span>
                      </Link>
                      <form action={deleteConversation}>
                        <input
                          type="hidden"
                          name="conversationId"
                          value={conversation.id}
                        />
                        <button
                          type="submit"
                          aria-label={`Apagar a conversa ${conversation.title}`}
                          className="rounded-lg px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/conv:opacity-100 hover:text-destructive-foreground focus-visible:opacity-100"
                        >
                          Apagar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 pb-3 text-sm text-muted-foreground">
                  As conversas aparecem aqui.
                </p>
              )}
            </div>
            {state.keySavedInApp ? (
              <form action={removeAnthropicApiKey} className="px-1">
                <button
                  type="submit"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Remover a chave da Anthropic
                </button>
              </form>
            ) : null}
          </aside>
        </div>
      ) : (
        <AssistantSetup />
      )}
    </>
  );
}
