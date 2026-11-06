import { describe, expect, it, vi } from "vitest";

import { handleMcpMessage, type McpHandlers } from "./protocol";
import {
  generateMcpToken,
  hashMcpToken,
  verifyMcpAuthorization,
} from "./token";

const handlers: McpHandlers = {
  listTools: () => [
    {
      name: "get_overview",
      description: "Panorama",
      inputSchema: { type: "object", properties: {} },
    },
  ],
  callTool: vi.fn(async () => ({ text: '{"saldo":1}', isError: false })),
};

describe("MCP token", () => {
  it("accepts only the bearer token whose hash is stored", () => {
    const token = generateMcpToken();
    const hash = hashMcpToken(token);

    expect(token.startsWith("wmcp_")).toBe(true);
    expect(verifyMcpAuthorization(`Bearer ${token}`, hash)).toBe(true);
    expect(verifyMcpAuthorization(`Bearer ${generateMcpToken()}`, hash)).toBe(
      false,
    );
    expect(verifyMcpAuthorization(token, hash)).toBe(false);
    expect(verifyMcpAuthorization(`Bearer ${token}`, null)).toBe(false);
    expect(verifyMcpAuthorization(null, hash)).toBe(false);
  });
});

describe("MCP protocol", () => {
  it("negotiates the protocol version on initialize", async () => {
    await expect(
      handleMcpMessage(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-06-18" },
        },
        handlers,
      ),
    ).resolves.toMatchObject({
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "worthly" },
      },
    });
    await expect(
      handleMcpMessage(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "initialize",
          params: { protocolVersion: "1999-01-01" },
        },
        handlers,
      ),
    ).resolves.toMatchObject({ result: { protocolVersion: "2025-11-25" } });
  });

  it("lists and calls tools", async () => {
    await expect(
      handleMcpMessage(
        { jsonrpc: "2.0", id: 3, method: "tools/list" },
        handlers,
      ),
    ).resolves.toMatchObject({ result: { tools: [{ name: "get_overview" }] } });

    await expect(
      handleMcpMessage(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "get_overview", arguments: {} },
        },
        handlers,
      ),
    ).resolves.toEqual({
      jsonrpc: "2.0",
      id: 4,
      result: {
        content: [{ type: "text", text: '{"saldo":1}' }],
        isError: false,
      },
    });
  });

  it("ignores notifications and rejects bad requests", async () => {
    await expect(
      handleMcpMessage(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        handlers,
      ),
    ).resolves.toBeNull();
    await expect(handleMcpMessage({ id: 1 }, handlers)).resolves.toMatchObject({
      error: { code: -32600 },
    });
    await expect(
      handleMcpMessage({ jsonrpc: "2.0", id: 5, method: "nope" }, handlers),
    ).resolves.toMatchObject({ error: { code: -32601 } });
    await expect(
      handleMcpMessage(
        {
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: { name: "delete_everything" },
        },
        handlers,
      ),
    ).resolves.toMatchObject({ error: { code: -32602 } });
  });
});
