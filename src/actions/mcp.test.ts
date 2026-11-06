import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsert: vi.fn(), updateMany: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { appSettings: mocks } }));

import { hashMcpToken } from "@/lib/mcp/token";
import { createMcpToken, revokeMcpToken } from "./mcp";

describe("MCP token actions", () => {
  it("returns the token once and stores only its hash", async () => {
    const { token } = await createMcpToken({ token: null });

    expect(token).toMatch(/^wmcp_/);
    const saved = mocks.upsert.mock.calls[0]?.[0].update;
    expect(saved.mcpTokenHash).toBe(hashMcpToken(token as string));
    expect(JSON.stringify(mocks.upsert.mock.calls)).not.toContain(
      token as string,
    );
  });

  it("revokes the token", async () => {
    await revokeMcpToken();

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "default" },
      data: { mcpTokenHash: null, mcpTokenCreatedAt: null },
    });
  });
});
