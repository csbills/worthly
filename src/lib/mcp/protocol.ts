/**
 * Um servidor MCP mínimo sobre HTTP (JSON-RPC 2.0, respostas em JSON): só o
 * necessário para listar e chamar ferramentas de leitura. Módulo puro — as
 * ferramentas chegam por parâmetro.
 */

export const MCP_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
] as const;

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpToolResult = { text: string; isError: boolean };

export type McpHandlers = {
  listTools: () => McpTool[];
  callTool: (name: string, input: unknown) => Promise<McpToolResult>;
};

type JsonRpcId = string | number | null;

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      error: { code: number; message: string };
    };

const errors = {
  invalidRequest: { code: -32600, message: "Invalid Request" },
  methodNotFound: { code: -32601, message: "Method not found" },
  invalidParams: { code: -32602, message: "Invalid params" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reply(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function fail(
  id: JsonRpcId,
  error: { code: number; message: string },
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error };
}

/** Responde uma mensagem. Notificações (sem id) não têm resposta: null. */
export async function handleMcpMessage(
  message: unknown,
  handlers: McpHandlers,
): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || message.jsonrpc !== "2.0") {
    return fail(null, errors.invalidRequest);
  }

  const hasId = "id" in message;
  const id = (hasId ? message.id : null) as JsonRpcId;
  const method = typeof message.method === "string" ? message.method : null;
  const params = isRecord(message.params) ? message.params : {};

  if (!hasId) return null;
  if (!method) return fail(id, errors.invalidRequest);

  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      const protocolVersion =
        typeof requested === "string" &&
        (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
          ? requested
          : MCP_PROTOCOL_VERSIONS[0];

      return reply(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "worthly", version: "0.1.0" },
        instructions:
          "Dados financeiros pessoais desta instância do Worthly, somente leitura: transações, gastos por categoria, contas, cartões, investimentos, orçamentos, assinaturas e metas. Valores em BRL.",
      });
    }
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: handlers.listTools() });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : null;
      if (!name || !handlers.listTools().some((tool) => tool.name === name)) {
        return fail(id, errors.invalidParams);
      }
      const result = await handlers.callTool(name, params.arguments ?? {});
      return reply(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.isError,
      });
    }
    default:
      return fail(id, errors.methodNotFound);
  }
}
