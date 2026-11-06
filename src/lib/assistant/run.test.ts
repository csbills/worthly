import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/assistant/tools", () => ({
  getAssistantTools: () => [
    { name: "get_overview", description: "Panorama", inputSchema: {} },
  ],
  getAssistantToolLabel: () => "Olhando o panorama do mês",
  runAssistantTool: vi.fn(async (call: { id: string }) => ({
    type: "tool_result",
    toolCallId: call.id,
    content: '{"saldo":10}',
  })),
}));

import {
  type AssistantProvider,
  AssistantProviderError,
  type ProviderTurn,
} from "./providers/contract";
import { type AssistantEvent, runAssistantTurn } from "./run";

function fakeProvider(
  turns: (ProviderTurn | Error)[],
  deltas: string[][] = [],
) {
  const streamTurn = vi.fn(
    async (request: Parameters<AssistantProvider["streamTurn"]>[0]) => {
      const index = streamTurn.mock.calls.length - 1;
      for (const delta of deltas[index] ?? []) request.onText(delta);
      const next = turns[index];
      if (!next) throw new Error("no more turns");
      if (next instanceof Error) throw next;
      return next;
    },
  );
  const provider: AssistantProvider = {
    id: "fake",
    label: "Fake",
    model: "fake-1",
    streamTurn,
    validate: async () => {},
  };
  return { provider, streamTurn };
}

const toolTurn: ProviderTurn = {
  stopReason: "tool_use",
  message: {
    role: "assistant",
    parts: [{ type: "tool_call", id: "tu_1", name: "get_overview", input: {} }],
  },
};
const answer: ProviderTurn = {
  stopReason: "end",
  message: {
    role: "assistant",
    parts: [{ type: "text", text: "Seu saldo é R$ 10,00." }],
  },
};

describe("runAssistantTurn", () => {
  it("runs requested tools through any provider and returns the new messages", async () => {
    const { provider, streamTurn } = fakeProvider(
      [toolTurn, answer],
      [[], ["Seu saldo ", "é R$ 10,00."]],
    );
    const events: AssistantEvent[] = [];
    const results: string[] = [];

    const added = await runAssistantTurn({
      provider,
      history: [
        { role: "user", parts: [{ type: "text", text: "Qual meu saldo?" }] },
      ],
      onEvent: (event) => events.push(event),
      onToolResult: (name, content) => results.push(`${name}:${content}`),
      now: new Date("2026-11-05T12:00:00Z"),
      extraSystem: "Seja breve.",
    });

    expect(added).toEqual([
      toolTurn.message,
      {
        role: "user",
        parts: [
          { type: "tool_result", toolCallId: "tu_1", content: '{"saldo":10}' },
        ],
      },
      answer.message,
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
    expect(results).toEqual(['get_overview:{"saldo":10}']);

    const request = streamTurn.mock.calls[1]?.[0];
    expect(request?.messages).toHaveLength(3);
    expect(request?.system[1]).toContain("Seja breve.");
    expect(request?.tools.map((tool) => tool.name)).toEqual(["get_overview"]);
  });

  it("retries invalid output, then stops on a refusal", async () => {
    const { provider, streamTurn } = fakeProvider([
      new AssistantProviderError("invalid_output", "bad json"),
      { stopReason: "refusal", message: { role: "assistant", parts: [] } },
    ]);
    const events: AssistantEvent[] = [];

    await expect(
      runAssistantTurn({
        provider,
        history: [{ role: "user", parts: [{ type: "text", text: "?" }] }],
        onEvent: (event) => events.push(event),
      }),
    ).resolves.toEqual([]);
    expect(streamTurn).toHaveBeenCalledTimes(2);
    expect(events[0]).toMatchObject({ type: "error" });
  });

  it("rethrows provider errors other than invalid output", async () => {
    const error = new AssistantProviderError("auth", "nope");
    const { provider } = fakeProvider([error]);

    await expect(
      runAssistantTurn({
        provider,
        history: [{ role: "user", parts: [{ type: "text", text: "?" }] }],
        onEvent: () => {},
      }),
    ).rejects.toBe(error);
  });
});
