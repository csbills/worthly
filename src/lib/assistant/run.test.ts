import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/assistant/tools", () => ({
  getAssistantTools: () => [
    { name: "get_overview", input_schema: { type: "object" } },
  ],
  getAssistantToolLabel: () => "Olhando o panorama do mês",
  runAssistantTool: vi.fn(async (block: { id: string }) => ({
    type: "tool_result",
    tool_use_id: block.id,
    content: '{"saldo":10}',
  })),
}));

import { type AssistantEvent, runAssistantTurn } from "./run";

function fakeStream(message: Record<string, unknown>, deltas: string[] = []) {
  return {
    on: (event: string, handler: (delta: string) => void) => {
      if (event === "text") for (const delta of deltas) handler(delta);
    },
    finalMessage: async () => message,
  };
}

function fakeClient(responses: ReturnType<typeof fakeStream>[]) {
  const stream = vi.fn(() => {
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    return next;
  });
  return {
    client: { beta: { messages: { stream } } } as unknown as Anthropic,
    stream,
  };
}

describe("runAssistantTurn", () => {
  it("runs requested tools and returns the new messages in order", async () => {
    const toolUse = {
      type: "tool_use",
      id: "tu_1",
      name: "get_overview",
      input: {},
    };
    const { client, stream } = fakeClient([
      fakeStream({ stop_reason: "tool_use", content: [toolUse] }),
      fakeStream(
        {
          stop_reason: "end_turn",
          content: [{ type: "text", text: "Seu saldo é R$ 10,00." }],
        },
        ["Seu saldo ", "é R$ 10,00."],
      ),
    ]);
    const events: AssistantEvent[] = [];

    const added = await runAssistantTurn({
      client,
      history: [{ role: "user", content: "Qual meu saldo?" }],
      onEvent: (event) => events.push(event),
      now: new Date("2026-11-05T12:00:00Z"),
    });

    expect(added).toEqual([
      { role: "assistant", content: [toolUse] },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "tu_1", content: '{"saldo":10}' },
        ],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Seu saldo é R$ 10,00." }],
      },
    ]);
    expect(events).toEqual([
      {
        type: "tool",
        name: "get_overview",
        label: "Olhando o panorama do mês",
      },
      { type: "text", text: "Seu saldo " },
      { type: "text", text: "é R$ 10,00." },
    ]);

    const request = stream.mock.calls[1]?.[0] as unknown as Record<
      string,
      unknown
    >;
    expect(request).toMatchObject({
      model: "claude-opus-5-5",
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      output_config: { effort: "medium" },
    });
    expect((request.messages as unknown[]).length).toBe(3);
  });

  it("stops on a refusal without keeping the refused turn", async () => {
    const { client } = fakeClient([
      fakeStream({ stop_reason: "refusal", content: [] }),
    ]);
    const events: AssistantEvent[] = [];

    await expect(
      runAssistantTurn({
        client,
        history: [{ role: "user", content: "?" }],
        onEvent: (event) => events.push(event),
      }),
    ).resolves.toEqual([]);
    expect(events[0]).toMatchObject({ type: "error" });
  });

  it("rethrows API errors", async () => {
    const error = new Anthropic.APIError(500, undefined, "boom", undefined);
    const client = {
      beta: {
        messages: {
          stream: () => ({
            on: () => {},
            finalMessage: async () => Promise.reject(error),
          }),
        },
      },
    } as unknown as Anthropic;

    await expect(
      runAssistantTurn({
        client,
        history: [{ role: "user", content: "?" }],
        onEvent: () => {},
      }),
    ).rejects.toBe(error);
  });
});
