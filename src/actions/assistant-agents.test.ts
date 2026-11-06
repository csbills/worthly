import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { assistantAgent: mocks } }));

import { createAssistantAgent, deleteAssistantAgent } from "./assistant-agents";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("assistant agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an agent from a template", async () => {
    await createAssistantAgent(form({ template: "subscriptions" }));

    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Caçador de assinaturas",
        emoji: "🔎",
      }),
    });
  });

  it("creates a custom agent and trims long instructions", async () => {
    await createAssistantAgent(
      form({ name: " Viagem ", emoji: "✈️", instructions: "x".repeat(2000) }),
    );

    const data = mocks.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ name: "Viagem", emoji: "✈️" });
    expect(data.instructions).toHaveLength(1500);
  });

  it("requires a name and instructions, and deletes by id", async () => {
    await createAssistantAgent(form({ name: "Só nome" }));
    expect(mocks.create).not.toHaveBeenCalled();

    await deleteAssistantAgent(form({ agentId: "a1" }));
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "a1" } });
  });
});
