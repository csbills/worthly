import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  createRule: vi.fn(),
  findRules: vi.fn(),
  deleteRule: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transactionOverride: { upsert: mocks.upsert },
    categoryRule: {
      create: mocks.createRule,
      findMany: mocks.findRules,
      delete: mocks.deleteRule,
    },
  },
}));

import {
  deleteCategoryRule,
  listCategoryRules,
  saveTransactionAdjustment,
} from "./transaction-adjustments";

describe("transaction adjustment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the category, a trimmed note and the ignored flag", async () => {
    await expect(
      saveTransactionAdjustment({
        transactionId: "tx-1",
        categoryId: "11000000",
        note: "  jantar com a família ",
        ignored: true,
      }),
    ).resolves.toEqual({ ok: true });

    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { transactionId: "tx-1" },
      create: {
        transactionId: "tx-1",
        categoryId: "11000000",
        note: "jantar com a família",
        ignored: true,
      },
      update: {
        categoryId: "11000000",
        note: "jantar com a família",
        ignored: true,
      },
    });
    expect(mocks.createRule).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("creates a rule for similar transactions when asked", async () => {
    await saveTransactionAdjustment({
      transactionId: "tx-1",
      categoryId: "19000000",
      note: "",
      ignored: false,
      rulePattern: " Uber ",
    });

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { categoryId: "19000000", note: null, ignored: false },
      }),
    );
    expect(mocks.createRule).toHaveBeenCalledWith({
      data: { pattern: "Uber", categoryId: "19000000" },
    });
  });

  it("rejects unknown categories and useless rules", async () => {
    await expect(
      saveTransactionAdjustment({
        transactionId: "tx-1",
        categoryId: "nope",
        note: "",
        ignored: false,
      }),
    ).resolves.toEqual({ ok: false, message: "Categoria desconhecida." });
    await expect(
      saveTransactionAdjustment({
        transactionId: "tx-1",
        categoryId: "19000000",
        note: "",
        ignored: false,
        rulePattern: "a",
      }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      saveTransactionAdjustment({
        transactionId: "tx-1",
        categoryId: null,
        note: "",
        ignored: false,
        rulePattern: "uber",
      }),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("lists rules with their category labels and deletes them", async () => {
    mocks.findRules.mockResolvedValue([
      {
        id: "r1",
        pattern: "uber",
        categoryId: "19000000",
        createdAt: new Date(),
      },
    ]);

    await expect(listCategoryRules()).resolves.toEqual([
      expect.objectContaining({
        id: "r1",
        pattern: "uber",
        categoryLabel: "Transporte",
      }),
    ]);

    await deleteCategoryRule("r1");
    expect(mocks.deleteRule).toHaveBeenCalledWith({ where: { id: "r1" } });
  });
});
