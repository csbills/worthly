import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAnthropicProvider } from "./anthropic";
import type { ChatMessage } from "./contract";

function fakeClient(
  message: Record<string, unknown> | Error,
  deltas: string[] = [],
) {
  const stream = vi.fn((_params: unknown) => ({
    on: (event: string, handler: (delta: string) => void) => {
      if (event === "text") for (const delta of deltas) handler(delta);
    },
    finalMessage: async () => {
      if (message instanceof Error) throw message;
      return message;
    },
  }));
  return {
    client: { beta: { messages: { stream } } } as unknown as Anthropic,
    stream,
  };
}

describe("Anthropic provider", () => {
  it("sends the configured request and returns neutral parts plus the native blocks", async () => {
    const content = [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text: "Vou ver." },
      { type: "tool_use", id: "tu_1", name: "get_goals", input: {} },
    ];
    const { client, stream } = fakeClient(
      { stop_reason: "tool_use", content },
      ["Vou ver."],
    );
    const texts: string[] = [];
    const provider = createAnthropicProvider({ apiKey: "k", client });

    const turn = await provider.streamTurn({
      system: ["Prompt", "Hoje é…"],
      messages: [{ role: "user", parts: [{ type: "text", text: "Metas?" }] }],
      tools: [
        {
          name: "get_goals",
          description: "Metas",
          inputSchema: { type: "object" },
        },
      ],
      onText: (delta) => texts.push(delta),
    });

    expect(texts).toEqual(["Vou ver."]);
    expect(turn).toEqual({
      stopReason: "tool_use",
      message: {
        role: "assistant",
        parts: [
          { type: "text", text: "Vou ver." },
          { type: "tool_call", id: "tu_1", name: "get_goals", input: {} },
        ],
        native: {
          provider: "anthropic",
          model: "claude-opus-5-5",
          message: content,
        },
      },
    });
    expect(stream.mock.calls[0]?.[0]).toMatchObject({
      model: "claude-opus-5-5",
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: "Prompt" },
        { type: "text", text: "Hoje é…" },
      ],
      tools: [{ name: "get_goals", eager_input_streaming: true }],
      messages: [{ role: "user", content: [{ type: "text", text: "Metas?" }] }],
    });
  });

  it("replays its own blocks untouched and converts tool results", async () => {
    const { client, stream } = fakeClient({
      stop_reason: "end_turn",
      content: [],
    });
    const native = [{ type: "thinking", thinking: "", signature: "s" }];
    const history: ChatMessage[] = [
      {
        role: "assistant",
        parts: [{ type: "tool_call", id: "t", name: "x", input: {} }],
        native: {
          provider: "anthropic",
          model: "claude-opus-5-5",
          message: native,
        },
      },
      {
        role: "user",
        parts: [
          {
            type: "tool_result",
            toolCallId: "t",
            content: "{}",
            isError: true,
          },
        ],
      },
    ];

    await createAnthropicProvider({ apiKey: "k", client }).streamTurn({
      system: [],
      messages: history,
      tools: [],
      onText: () => {},
    });

    expect(
      (stream.mock.calls[0]?.[0] as { messages: unknown }).messages,
    ).toEqual([
      { role: "assistant", content: native },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "t",
            content: "{}",
            is_error: true,
          },
        ],
      },
    ]);
  });

  it("maps SDK errors to the contract", async () => {
    const error = new Anthropic.APIError(500, undefined, "boom", undefined);
    const { client } = fakeClient(error);

    await expect(
      createAnthropicProvider({ apiKey: "k", client }).streamTurn({
        system: [],
        messages: [],
        tools: [],
        onText: () => {},
      }),
    ).rejects.toMatchObject({ kind: "api" });

    const broken = fakeClient(new SyntaxError("bad json"));
    await expect(
      createAnthropicProvider({
        apiKey: "k",
        client: broken.client,
      }).streamTurn({
        system: [],
        messages: [],
        tools: [],
        onText: () => {},
      }),
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });
});
