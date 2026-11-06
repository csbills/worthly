"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { generateMcpToken, hashMcpToken } from "@/lib/mcp/token";
import { prisma } from "@/lib/prisma";

export type McpTokenState = { token: string | null };

export async function getMcpStatus() {
  await verifySession();

  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
    select: { mcpTokenHash: true, mcpTokenCreatedAt: true },
  });

  return {
    enabled: Boolean(settings?.mcpTokenHash),
    createdAt: settings?.mcpTokenCreatedAt?.toISOString() ?? null,
  };
}

/**
 * Cria (ou troca) o token do servidor MCP. O token só volta nesta resposta;
 * o banco guarda o hash. Trocar invalida o anterior.
 */
export async function createMcpToken(
  _previous: McpTokenState,
): Promise<McpTokenState> {
  await verifySession();

  const token = generateMcpToken();
  const data = {
    mcpTokenHash: hashMcpToken(token),
    mcpTokenCreatedAt: new Date(),
  };

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  revalidatePath("/security");

  return { token };
}

export async function revokeMcpToken() {
  await verifySession();

  await prisma.appSettings.updateMany({
    where: { id: "default" },
    data: { mcpTokenHash: null, mcpTokenCreatedAt: null },
  });
  revalidatePath("/security");
}
