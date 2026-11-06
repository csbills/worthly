import Anthropic from "@anthropic-ai/sdk";

import { runDemoAssistantTurn } from "@/lib/assistant/demo";
import {
  type AssistantEvent,
  describeAssistantError,
  runAssistantTurn,
} from "@/lib/assistant/run";
import {
  appendConversationMessages,
  createConversation,
  findConversation,
  getAnthropicApiKey,
  loadConversationHistory,
} from "@/lib/assistant/store";
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

  const apiKey = await getAnthropicApiKey();
  const demo = !apiKey && isDemoMode();

  if (!apiKey && !demo) {
    return Response.json(
      { error: "Configure a chave da Anthropic para conversar com o Tito." },
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
  const userMessage: Anthropic.Beta.BetaMessageParam = {
    role: "user",
    content: question,
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

      try {
        const added = apiKey
          ? await runAssistantTurn({
              client: new Anthropic({ apiKey }),
              history: [...history, userMessage],
              onEvent: send,
              extraSystem: conversation.agent?.instructions ?? null,
            })
          : await runDemoAssistantTurn({ onEvent: send });

        await appendConversationMessages(conversation.id, added);
        send({ type: "done" });
      } catch (error) {
        send({ type: "error", message: describeAssistantError(error) });
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
