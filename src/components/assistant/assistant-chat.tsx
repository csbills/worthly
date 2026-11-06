"use client";

import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { TranscriptEntryView } from "@/actions/assistant";
import { ProposalCard } from "@/components/assistant/proposal-card";
import { RichText } from "@/components/assistant/rich-text";
import { Tito } from "@/components/mascot/tito";
import type { AssistantEvent } from "@/lib/assistant/run";
import { cn } from "@/lib/utils";

type ChatEntry = TranscriptEntryView & { pending?: boolean };

const blankEntry = {
  tools: [],
  proposalIds: [],
  unverified: [],
  proposals: [],
};

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-rise-in">
      <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-primary-foreground">
        {text}
      </p>
    </div>
  );
}

function AssistantBubble({
  entry,
  status,
  isLast,
}: {
  entry: ChatEntry;
  status: string | null;
  isLast: boolean;
}) {
  const thinking = entry.pending && !entry.text;

  return (
    <div className="flex items-start gap-2.5 animate-rise-in">
      <Tito
        mood={thinking ? "thinking" : "idle"}
        size="sm"
        animated={isLast}
        className="-mt-1 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-2">
        {status && entry.pending ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-assistant-soft px-3 py-1 text-xs text-assistant">
            <span className="size-1.5 animate-pulse rounded-full bg-assistant" />
            {status}…
          </p>
        ) : null}
        {entry.text ? (
          <div className="surface rounded-3xl rounded-tl-lg px-4 py-3 text-sm leading-6 text-foreground/90">
            <RichText text={entry.text} />
            {entry.unverified.length > 0 ? (
              <p className="mt-2 border-t pt-2 text-xs leading-5 text-muted-foreground">
                <span aria-hidden="true">⚠️ </span>
                Não conferido nos seus dados: {entry.unverified.join(", ")}.
                Trate como estimativa do Tito.
              </p>
            ) : null}
          </div>
        ) : thinking && !status ? (
          <p className="pt-2 text-sm text-muted-foreground">Pensando…</p>
        ) : null}
        {entry.proposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}

export function AssistantChat({
  conversationId: initialConversationId,
  initialEntries,
  suggestions,
  demo,
  initialQuestion = null,
  agent = null,
}: {
  conversationId: string | null;
  initialEntries: TranscriptEntryView[];
  suggestions: readonly string[];
  demo: boolean;
  /** Pergunta vinda de um atalho (?q=), enviada assim que a tela abre. */
  initialQuestion?: string | null;
  /** Especialista escolhido para uma conversa nova. */
  agent?: { id: string; name: string; emoji: string } | null;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<ChatEntry[]>(initialEntries);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const askedInitial = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola a cada mudança
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, status]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: envia uma vez só, ao abrir
  useEffect(() => {
    if (askedInitial.current || !initialQuestion || entries.length > 0) return;
    askedInitial.current = true;
    send(initialQuestion);
  }, []);

  function updateLast(update: (entry: ChatEntry) => ChatEntry) {
    setEntries((current) => {
      const last = current.at(-1);
      if (!last || last.role !== "assistant") return current;
      return [...current.slice(0, -1), update(last)];
    });
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    setSending(true);
    setStatus(null);
    setEntries((current) => [
      ...current,
      { role: "user", text, ...blankEntry },
      { role: "assistant", text: "", ...blankEntry, pending: true },
    ]);

    let newConversationId: string | null = null;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          agentId: conversationId ? null : (agent?.id ?? null),
        }),
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Não consegui falar com o Tito.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AssistantEvent;

          if (event.type === "conversation") {
            if (!conversationId) newConversationId = event.id;
            setConversationId(event.id);
          } else if (event.type === "text") {
            setStatus(null);
            updateLast((entry) => ({
              ...entry,
              text: entry.text + event.text,
            }));
          } else if (event.type === "tool") {
            setStatus(event.label);
            updateLast((entry) => ({
              ...entry,
              text: entry.text ? `${entry.text}\n\n` : "",
              tools: [...entry.tools, event.name],
            }));
          } else if (event.type === "proposal") {
            updateLast((entry) => ({
              ...entry,
              proposals: [...entry.proposals, event.proposal],
            }));
          } else if (event.type === "checked") {
            updateLast((entry) => ({ ...entry, unverified: event.unverified }));
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Algo deu errado.");
    } finally {
      updateLast((entry) => ({
        ...entry,
        text: entry.text.trim(),
        pending: false,
      }));
      setEntries((current) =>
        current.filter(
          (entry) =>
            entry.role === "user" || entry.text || entry.proposals.length > 0,
        ),
      );
      setSending(false);
      setStatus(null);
      textareaRef.current?.focus();
      if (newConversationId) {
        // Atualiza a lista de conversas sem perder a resposta na tela.
        router.replace(`/assistant?c=${newConversationId}`, { scroll: false });
      }
    }
  }

  const empty = entries.length === 0;

  return (
    <div className="flex min-h-[60dvh] min-w-0 flex-1 flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 pb-8 text-center">
          <Tito mood="wave" size="lg" />
          <div>
            <p className="text-lg font-medium">
              {agent
                ? `${agent.emoji} Tito, ${agent.name.toLocaleLowerCase("pt-BR")}`
                : "Oi! Eu sou o Tito."}
            </p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Pergunte qualquer coisa sobre o seu dinheiro. Eu leio suas contas,
              cartões e investimentos e respondo com os números reais.
            </p>
            {demo ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Modo demo: as respostas são um resumo pronto, sem IA.
              </p>
            ) : null}
          </div>
          <div className="stagger flex max-w-xl flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="rounded-full border bg-card px-3.5 py-2 text-sm text-foreground/80 shadow-elevation-1 transition-[background-color,transform] hover:bg-muted active:scale-[0.98]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-5 pb-4">
          {entries.map((entry, index) =>
            entry.role === "user" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: histórico só cresce
              <UserBubble key={index} text={entry.text} />
            ) : (
              <AssistantBubble
                // biome-ignore lint/suspicious/noArrayIndexKey: histórico só cresce
                key={index}
                entry={entry}
                status={index === entries.length - 1 ? status : null}
                isLast={index === entries.length - 1}
              />
            ),
          )}
          {error ? (
            <div className="flex items-start gap-2.5 animate-rise-in">
              <Tito mood="worried" size="sm" className="-mt-1" />
              <p
                role="alert"
                className="rounded-2xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive-foreground"
              >
                {error}
              </p>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      )}

      <form
        className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mt-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-3xl border bg-card p-2 pl-4 shadow-elevation-3 focus-within:border-ring/60">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Pergunte ao Tito…"
            aria-label="Pergunta para o Tito"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 outline-none [field-sizing:content] placeholder:text-muted-foreground/70"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Enviar"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] active:scale-95 disabled:opacity-40",
            )}
          >
            <HugeiconsIcon
              icon={ArrowUp02Icon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        </div>
      </form>
    </div>
  );
}
