import { getAssistantTools, runAssistantTool } from "@/lib/assistant/tools";
import { runAsServiceUser } from "@/lib/auth/service-context";
import { handleMcpMessage, type McpHandlers } from "@/lib/mcp/protocol";
import { verifyMcpAuthorization } from "@/lib/mcp/token";
import { prisma } from "@/lib/prisma";

/**
 * Servidor MCP da instância (Claude Desktop, Claude Code e outros clientes):
 * as mesmas ferramentas de leitura do Tito, autenticadas por um token criado
 * em Segurança. Nada aqui altera dados.
 */
const handlers: McpHandlers = {
  listTools: () =>
    getAssistantTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  callTool: async (name, input) => {
    const result = await runAssistantTool({ id: "mcp", name, input });

    return { text: result.content, isError: Boolean(result.isError) };
  },
};

async function getOwner() {
  const [settings, user] = await Promise.all([
    prisma.appSettings.findUnique({
      where: { id: "default" },
      select: { mcpTokenHash: true },
    }),
    // A instância tem uma conta só: a criada no primeiro acesso.
    prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  return { tokenHash: settings?.mcpTokenHash ?? null, user };
}

export async function POST(request: Request) {
  const { tokenHash, user } = await getOwner();

  if (
    !user ||
    !verifyMcpAuthorization(request.headers.get("authorization"), tokenHash)
  ) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const body = await request.json().catch(() => undefined);

  if (body === undefined) {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400 },
    );
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses = await runAsServiceUser(
    { ...user, hasPasskeys: false },
    () =>
      Promise.all(
        messages.map((message) => handleMcpMessage(message, handlers)),
      ),
  );
  const replies = responses.filter((response) => response !== null);

  if (replies.length === 0) {
    return new Response(null, { status: 202 });
  }

  return Response.json(Array.isArray(body) ? replies : replies[0], {
    headers: { "Cache-Control": "no-store" },
  });
}

/** Sem fluxo de eventos do servidor: só requisição e resposta. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
