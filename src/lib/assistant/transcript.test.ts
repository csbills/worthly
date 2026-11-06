import { describe, expect, it } from "vitest";

import { conversationTitle, toTranscript } from "./transcript";

describe("assistant transcript", () => {
  it("hides tool plumbing, merges tool rounds and collects proposals", () => {
    expect(
      toTranscript([
        {
          role: "user",
          parts: [{ type: "text", text: "Organize carro de 25 mil" }],
        },
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Vou montar." },
            { type: "tool_call", id: "t1", name: "propose_goals", input: {} },
          ],
        },
        {
          role: "user",
          parts: [
            {
              type: "tool_result",
              toolCallId: "t1",
              content: '{"proposalId":"p1","schedule":{"extraNeeded":890}}',
            },
          ],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "O carro de R$ 25 mil pede R$ 890 a mais por mês, ou R$ 2.273 se for em 11 meses.",
            },
          ],
        },
      ]),
    ).toEqual([
      {
        role: "user",
        text: "Organize carro de 25 mil",
        tools: [],
        proposalIds: [],
        unverified: [],
      },
      {
        role: "assistant",
        text: "Vou montar.\n\nO carro de R$ 25 mil pede R$ 890 a mais por mês, ou R$ 2.273 se for em 11 meses.",
        tools: ["propose_goals"],
        proposalIds: ["p1"],
        unverified: ["R$ 2.273"],
      },
    ]);
  });

  it("ignores failed proposals", () => {
    const entries = toTranscript([
      { role: "user", parts: [{ type: "text", text: "Metas" }] },
      {
        role: "assistant",
        parts: [
          { type: "tool_call", id: "t1", name: "propose_goals", input: {} },
        ],
      },
      {
        role: "user",
        parts: [
          {
            type: "tool_result",
            toolCallId: "t1",
            content: '{"proposalId":"x"}',
            isError: true,
          },
        ],
      },
    ]);

    expect(entries[1]?.proposalIds).toEqual([]);
  });

  it("builds short titles", () => {
    expect(conversationTitle("  Quanto   gastei?  ")).toBe("Quanto gastei?");
    expect(conversationTitle("a".repeat(80))).toHaveLength(58);
    expect(conversationTitle("   ")).toBe("Nova conversa");
  });
});
