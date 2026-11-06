import type { Metadata } from "next";
import Link from "next/link";

import {
  deleteConversation,
  getAssistantState,
  getConversationTranscript,
  removeAssistantKey,
} from "@/actions/assistant";
import {
  type AssistantAgentView,
  createAssistantAgent,
  deleteAssistantAgent,
  listAssistantAgents,
} from "@/actions/assistant-agents";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { AssistantKeyForm } from "@/components/assistant/assistant-key-form";
import { Tito } from "@/components/mascot/tito";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  assistantAgentTemplates,
  MAX_AGENT_INSTRUCTIONS,
} from "@/lib/assistant/agent-templates";
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
        O Tito responde perguntas sobre o seu dinheiro usando o modelo de
        linguagem que você escolher — Claude, DeepSeek ou outro compatível com a
        API da OpenAI. A chave fica só neste servidor.
      </p>
      <ul className="mt-4 space-y-1.5 text-left text-xs leading-5 text-muted-foreground">
        <li>
          • Ao perguntar, os dados necessários para a resposta (transações,
          saldos, categorias) são enviados ao provider escolhido.
        </li>
        <li>• Nada é enviado enquanto você não conversa com ele.</li>
        <li>
          • Ele só lê. Para criar metas, mostra um cartão e só cria quando você
          confirma.
        </li>
      </ul>
      <div className="mt-6">
        <AssistantKeyForm />
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Também dá para configurar pelo servidor: ASSISTANT_PROVIDER e
        ANTHROPIC_API_KEY, DEEPSEEK_API_KEY ou ASSISTANT_API_KEY.
      </p>
    </section>
  );
}

function AgentsSection({
  agents,
  activeAgentId,
}: {
  agents: AssistantAgentView[];
  activeAgentId: string | null;
}) {
  const available = assistantAgentTemplates.filter(
    (template) => !agents.some((agent) => agent.name === template.name),
  );

  return (
    <section className="surface overflow-hidden">
      <div className="border-b px-5 py-4 md:px-6">
        <h2 className="text-base font-medium">Especialistas</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Um Tito com foco fixo — numa meta, numa categoria, num hábito. As
          instruções dele valem a conversa inteira.
        </p>
      </div>
      {agents.length > 0 ? (
        <ul className="divide-y">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="flex items-center justify-between gap-3 px-5 py-3 md:px-6"
            >
              <Link
                href={`/assistant?agent=${agent.id}`}
                className={cn(
                  "min-w-0 flex-1 text-sm underline-offset-2 hover:underline",
                  agent.id === activeAgentId && "font-medium",
                )}
              >
                <span aria-hidden="true">{agent.emoji} </span>
                {agent.name}
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {agent.instructions}
                </span>
              </Link>
              <form action={deleteAssistantAgent}>
                <input type="hidden" name="agentId" value={agent.id} />
                <Button type="submit" size="sm" variant="ghost">
                  Apagar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t px-5 py-4 md:px-6">
          {available.map((template) => (
            <form key={template.key} action={createAssistantAgent}>
              <input type="hidden" name="template" value={template.key} />
              <button
                type="submit"
                className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                + {template.emoji} {template.name}
              </button>
            </form>
          ))}
        </div>
      ) : null}
      <details className="border-t px-5 py-4 md:px-6">
        <summary className="cursor-pointer list-none text-sm font-medium">
          + Criar um especialista
        </summary>
        <form action={createAssistantAgent} className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Input
              name="emoji"
              defaultValue="🤖"
              aria-label="Emoji"
              className="w-14 text-center"
            />
            <Input
              name="name"
              required
              maxLength={40}
              placeholder="Planejador da viagem"
              aria-label="Nome"
            />
          </div>
          <textarea
            name="instructions"
            required
            rows={4}
            maxLength={MAX_AGENT_INSTRUCTIONS}
            placeholder="Ex.: Me ajude a juntar R$ 15 mil para Lisboa até julho. Toda vez, confira a meta Viagem e diga de onde dá para cortar."
            aria-label="Instruções"
            className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:bg-input/30"
          />
          <Button type="submit">Criar especialista</Button>
        </form>
      </details>
    </section>
  );
}

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{
    c?: string | string[];
    q?: string | string[];
    agent?: string | string[];
  }>;
}) {
  const { c, q, agent: agentParam } = await searchParams;
  const initialQuestion = typeof q === "string" ? q.slice(0, 500) : null;
  const conversationId = typeof c === "string" ? c : null;
  const [state, transcript, agents] = await Promise.all([
    getAssistantState(),
    conversationId ? getConversationTranscript(conversationId) : null,
    listAssistantAgents(),
  ]);
  const agent =
    transcript?.agent ?? agents.find((item) => item.id === agentParam) ?? null;
  const ready = state.configured || state.demo;

  return (
    <>
      <PageHeader
        eyebrow={agent ? `${agent.emoji} ${agent.name}` : "Assistente"}
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
            key={transcript?.id ?? `new-${agent?.id ?? ""}`}
            conversationId={transcript?.id ?? null}
            initialEntries={transcript?.entries ?? []}
            suggestions={assistantSuggestions}
            demo={state.demo}
            initialQuestion={transcript ? null : initialQuestion}
            agent={agent}
          />

          <aside className="space-y-4">
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
                          className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition-opacity hover:text-destructive-foreground focus-visible:opacity-100 lg:opacity-0 lg:group-hover/conv:opacity-100"
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
            <details className="surface p-3 text-sm">
              <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
                Modelo: {state.providerLabel}
                {state.model ? ` · ${state.model}` : ""}
              </summary>
              <div className="mt-3">
                <AssistantKeyForm
                  current={{
                    provider: state.provider,
                    model: state.model,
                    baseUrl: state.baseUrl,
                    keySaved: state.keySavedInApp,
                  }}
                />
              </div>
              {state.keySavedInApp ? (
                <form action={removeAssistantKey} className="mt-3">
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Remover a chave salva
                  </button>
                </form>
              ) : null}
            </details>
          </aside>
        </div>
      ) : (
        <AssistantSetup />
      )}

      {ready ? (
        <AgentsSection agents={agents} activeAgentId={agent?.id ?? null} />
      ) : null}
    </>
  );
}
