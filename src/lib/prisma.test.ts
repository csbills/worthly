import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";

vi.mock("server-only", () => ({}));

const testItemId = "test-item-for-prisma";

afterEach(async () => {
  await prisma.pluggyItem.deleteMany({
    where: { itemId: testItemId },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Prisma client", () => {
  it("persists a Pluggy item identifier in SQLite", async () => {
    const createdItem = await prisma.pluggyItem.create({
      data: { itemId: testItemId },
    });

    const storedItem = await prisma.pluggyItem.findUnique({
      where: { itemId: testItemId },
    });

    expect(createdItem.itemId).toBe(testItemId);
    expect(storedItem?.itemId).toBe(testItemId);
  });
});
