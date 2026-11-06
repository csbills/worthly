import { describe, expect, it } from "vitest";

import { conversationTitle, toTranscript } from "./transcript";

describe("assistant transcript", () => {
  it("hides tool plumbing and merges one answer across tool rounds", () => {
    expect(
      toTranscript([
        { role: "user", content: "Quanto gastei?" },
        {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "" },
            { type: "text", text: "Vou conferir." },
            { type: "tool_use", id: "t1", name: "get_overview", input: {} },
          ],
        },
        {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "Você gastou **R$ 910,00**." }],
        },
        { role: "user", content: [{ type: "text", text: "Obrigado" }] },
      ]),
    ).toEqual([
      { role: "user", text: "Quanto gastei?", tools: [] },
      {
        role: "assistant",
        text: "Vou conferir.\n\nVocê gastou **R$ 910,00**.",
        tools: ["get_overview"],
      },
      { role: "user", text: "Obrigado", tools: [] },
    ]);
  });

  it("builds short titles", () => {
    expect(conversationTitle("  Quanto   gastei?  ")).toBe("Quanto gastei?");
    expect(conversationTitle("a".repeat(80))).toHaveLength(58);
    expect(conversationTitle("   ")).toBe("Nova conversa");
  });
});
