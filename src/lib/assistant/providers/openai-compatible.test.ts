import { describe, expect, it, vi } from "vitest";

import { AssistantProviderError, type ChatMessage } from "./contract";
import {
  createOpenAICompatibleProvider,
  toWireMessages,
} from "./openai-compatible";

function sse(chunks: unknown[]) {
  const text = `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\n\n")}\n\ndata: [DONE]\n\n`;
  const bytes = new TextEncoder().encode(text);
  // Quebra no meio para provar que o leitor junta pedaços.
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, 37));
      controller.enqueue(bytes.slice(37));
      controller.close();
    },
  });
}

const deepseek = (fetchMock: typeof fetch) =>
  createOpenAICompatibleProvider({
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/",
    apiKey: "sk-test",
    model: "deepseek-flash",
    fetch: fetchMock,
  });

describe("OpenAI-compatible provider", () => {
  it("streams text and rebuilds tool calls split across chunks", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          sse([
            { choices: [{ delta: { reasoning_content: "Preciso ver " } }] },
            { choices: [{ delta: { reasoning_content: "as metas." } }] },
            { choices: [{ delta: { content: "Vou conferir." } }] },
            {
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: "call_1",
                        function: { name: "get_goals", arguments: "" },
                      },
                    ],
                  },
                },
              ],
            },
            {
              choices: [
                {
                  delta: {
                    tool_calls: [
                      { index: 0, function: { arguments: '{"a":' } },
                    ],
                  },
                },
              ],
            },
            {
              choices: [
                {
                  delta: {
                    tool_calls: [{ index: 0, function: { arguments: "1}" } }],
                  },
                  finish_reason: "tool_calls",
                },
              ],
            },
          ]),
        ),
    ) as unknown as typeof fetch;
    const texts: string[] = [];

    const turn = await deepseek(fetchMock).streamTurn({
      system: ["Você é o Tito."],
      messages: [{ role: "user", parts: [{ type: "text", text: "Oi" }] }],
      tools: [
        {
          name: "get_goals",
          description: "Metas",
          inputSchema: { type: "object" },
        },
      ],
      onText: (delta) => texts.push(delta),
    });

    expect(texts).toEqual(["Vou conferir."]);
    expect(turn.stopReason).toBe("tool_use");
    expect(turn.message.parts).toEqual([
      { type: "text", text: "Vou conferir." },
      { type: "tool_call", id: "call_1", name: "get_goals", input: { a: 1 } },
    ]);
    expect(turn.message.native).toEqual({
      provider: "deepseek",
      model: "deepseek-flash",
      message: {
        role: "assistant",
        content: "Vou conferir.",
        reasoning_content: "Preciso ver as metas.",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "get_goals", arguments: '{"a":1}' },
          },
        ],
      },
    });

    const [url, init] = (
      fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: "deepseek-flash",
      stream: true,
      tools: [{ type: "function", function: { name: "get_goals" } }],
    });
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-test",
    );
  });

  it("replays its own native messages (with reasoning) and converts the rest", () => {
    const history: ChatMessage[] = [
      { role: "user", parts: [{ type: "text", text: "Quanto gastei?" }] },
      {
        role: "assistant",
        parts: [
          { type: "tool_call", id: "c1", name: "get_overview", input: {} },
        ],
        native: {
          provider: "deepseek",
          model: "deepseek-flash",
          message: {
            role: "assistant",
            content: null,
            reasoning_content: "…",
            tool_calls: [],
          },
        },
      },
      {
        role: "user",
        parts: [{ type: "tool_result", toolCallId: "c1", content: '{"x":1}' }],
      },
      {
        role: "assistant",
        parts: [{ type: "text", text: "De outro provider" }],
        native: { provider: "anthropic", model: "claude", message: [] },
      },
    ];

    expect(toWireMessages(["S"], history, "deepseek")).toEqual([
      { role: "system", content: "S" },
      { role: "user", content: "Quanto gastei?" },
      {
        role: "assistant",
        content: null,
        reasoning_content: "…",
        tool_calls: [],
      },
      { role: "tool", tool_call_id: "c1", content: '{"x":1}' },
      { role: "assistant", content: "De outro provider" },
    ]);
  });

  it("marks broken tool JSON instead of crashing", async () => {
    const fetchMock = (async () =>
      new Response(
        sse([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "c",
                      function: {
                        name: "propose_goals",
                        arguments: '{"goals": [',
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          },
        ]),
      )) as unknown as typeof fetch;

    const turn = await deepseek(fetchMock).streamTurn({
      system: [],
      messages: [],
      tools: [],
      onText: () => {},
    });

    expect(turn.message.parts[0]).toMatchObject({
      type: "tool_call",
      input: { __invalid_json: '{"goals": [' },
    });
  });

  it("maps HTTP errors to provider errors", async () => {
    const unauthorized = (async () =>
      new Response("nope", { status: 401 })) as unknown as typeof fetch;
    await expect(deepseek(unauthorized).validate()).rejects.toMatchObject({
      kind: "auth",
    });

    const limited = (async () =>
      new Response("slow", { status: 429 })) as unknown as typeof fetch;
    const error = await deepseek(limited)
      .streamTurn({ system: [], messages: [], tools: [], onText: () => {} })
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(AssistantProviderError);
    expect(error.kind).toBe("rate_limit");
  });
});
