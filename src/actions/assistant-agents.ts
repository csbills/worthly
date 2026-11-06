"use server";

import { revalidatePath } from "next/cache";

import {
  assistantAgentTemplates,
  MAX_AGENT_INSTRUCTIONS,
} from "@/lib/assistant/agent-templates";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export type AssistantAgentView = {
  id: string;
  name: string;
  emoji: string;
  instructions: string;
};

function readText(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function listAssistantAgents(): Promise<AssistantAgentView[]> {
  await verifySession();

  return prisma.assistantAgent.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, emoji: true, instructions: true },
  });
}

export async function createAssistantAgent(formData: FormData) {
  await verifySession();

  const template = assistantAgentTemplates.find(
    (item) => item.key === formData.get("template"),
  );
  const name = template?.name ?? readText(formData, "name", 40);
  const instructions =
    template?.instructions ??
    readText(formData, "instructions", MAX_AGENT_INSTRUCTIONS);
  const emoji =
    template?.emoji ??
    ([...readText(formData, "emoji", 8)].slice(0, 2).join("") || "🤖");

  if (!name || !instructions) return;

  await prisma.assistantAgent.create({ data: { name, emoji, instructions } });
  revalidatePath("/assistant");
}

export async function deleteAssistantAgent(formData: FormData) {
  await verifySession();

  const id = formData.get("agentId");
  if (typeof id === "string" && id) {
    await prisma.assistantAgent.deleteMany({ where: { id } });
  }
  revalidatePath("/assistant");
}
