import { getProposals } from "@/actions/goal-proposals";
import { runDemoAssistantTurn } from "@/lib/assistant/demo";
import type { ChatMessage } from "@/lib/assistant/providers/contract";
import {
  type AssistantEvent,
  describeAssistantError,
  runAssistantTurn,
} from "@/lib/assistant/run";
import {
  appendConversationMessages,
  createConversation,
  findConversation,
  getAssistantProvider,
  loadConversationHistory,
} from "@/lib/assistant/store";
import { toTranscript } from "@/lib/assistant/transcript";
import { verifySession } from "@/lib/auth/dal";
import { isDemoMode } from "@/lib/demo/pluggy-demo-client";

const MAX_QUESTION_LENGTH = 2000;

/**
 * Uma pergunta ao Tito. A resposta chega em NDJSON, um evento por linha
 * (texto, ferramenta em uso, fim ou erro), para a tela mostrar o Tito
 * pensando e o texto aparecendo aos poucos.
 */
export async function POST(request: Request) {
  await verifySession();

  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
    conversationId?: unknown;
    agentId?: unknown;
  } | null;
  const question =
    typeof body?.message === "string"
      ? body.message.trim().slice(0, MAX_QUESTION_LENGTH)
      : "";

  if (!question) {
    return Response.json({ error: "Escreva uma pergunta." }, { status: 400 });
  }

  const provider = await getAssistantProvider();
  const demo = !provider && isDemoMode();

  if (!provider && !demo) {
    return Response.json(
      { error: "Configure o modelo do Tito para conversar com ele." },
      { status: 409 },
    );
  }

  const existing =
    typeof body?.conversationId === "string"
      ? await findConversation(body.conversationId)
      : null;
  const conversation =
    existing ??
    (await createConversation(
      question,
      typeof body?.agentId === "string" ? body.agentId : null,
    ));
  const history = existing ? await loadConversationHistory(existing.id) : [];
  const userMessage: ChatMessage = {
    role: "user",
    parts: [{ type: "text", text: question }],
  };

  // A pergunta fica salva mesmo se a resposta falhar no meio.
  await appendConversationMessages(conversation.id, [userMessage]);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      send({
        type: "conversation",
        id: conversation.id,
        title: conversation.title,
      });

      // Propostas viram cartões assim que a ferramenta termina.
      const published: Promise<void>[] = [];
      const publishProposal = (name: string, content: string) => {
        if (name !== "propose_goals") return;
        try {
          const { proposalId } = JSON.parse(content) as { proposalId?: string };
          if (!proposalId) return;
          published.push(
            getProposals([proposalId]).then(([proposal]) => {
              if (proposal) send({ type: "proposal", proposal });
            }),
          );
        } catch {
          // Resultado sem proposta: nada a mostrar.
        }
      };

      try {
        const added = provider
          ? await runAssistantTurn({
              provider,
              history: [...history, userMessage],
              onEvent: send,
              extraSystem: conversation.agent?.instructions ?? null,
              onToolResult: publishProposal,
            })
          : await runDemoAssistantTurn({ onEvent: send, question });

        await Promise.allSettled(published);
        await appendConversationMessages(conversation.id, added);
        const answer = toTranscript([...history, userMessage, ...added]).at(-1);
        if (answer?.role === "assistant") {
          send({ type: "checked", unverified: answer.unverified });
        }
        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          message: describeAssistantError(error, provider?.label),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
