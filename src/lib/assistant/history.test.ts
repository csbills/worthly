import { describe, expect, it } from "vitest";

import { decodeStoredMessage, encodeStoredMessage } from "./history";
import type { ChatMessage } from "./providers/contract";

describe("assistant history storage", () => {
  it("round-trips neutral messages with their native payload", () => {
    const message: ChatMessage = {
      role: "assistant",
      parts: [{ type: "tool_call", id: "c1", name: "get_goals", input: {} }],
      native: {
        provider: "deepseek",
        model: "deepseek-flash",
        message: { role: "assistant", reasoning_content: "…" },
      },
    };

    expect(
      decodeStoredMessage("assistant", encodeStoredMessage(message)),
    ).toEqual(message);
  });

  it("reads conversations saved in the old Anthropic format", () => {
    expect(
      decodeStoredMessage("user", JSON.stringify("Quanto gastei?")),
    ).toEqual({
      role: "user",
      parts: [{ type: "text", text: "Quanto gastei?" }],
    });

    const content = [
      { type: "thinking", thinking: "", signature: "s" },
      { type: "text", text: "Vou ver." },
      { type: "tool_use", id: "t1", name: "get_overview", input: { a: 1 } },
    ];
    expect(decodeStoredMessage("assistant", JSON.stringify(content))).toEqual({
      role: "assistant",
      parts: [
        { type: "text", text: "Vou ver." },
        { type: "tool_call", id: "t1", name: "get_overview", input: { a: 1 } },
      ],
      native: {
        provider: "anthropic",
        model: "claude-opus-5-5",
        message: content,
      },
    });

    expect(
      decodeStoredMessage(
        "user",
        JSON.stringify([
          {
            type: "tool_result",
            tool_use_id: "t1",
            content: '{"x":1}',
            is_error: true,
          },
        ]),
      ),
    ).toEqual({
      role: "user",
      parts: [
        {
          type: "tool_result",
          toolCallId: "t1",
          content: '{"x":1}',
          isError: true,
        },
      ],
    });
  });

  it("survives corrupted rows", () => {
    expect(decodeStoredMessage("assistant", "{oops")).toEqual({
      role: "assistant",
      parts: [],
    });
  });
});
