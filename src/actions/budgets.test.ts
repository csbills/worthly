import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCategorySpending: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/actions/categories", () => ({
  getCategorySpending: mocks.getCategorySpending,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    budget: {
      findMany: mocks.findMany,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}));

import { getBudgetsOverview, removeBudget, saveBudget } from "./budgets";

const months: Record<string, { previous: string; groups: [string, number][] }> =
  {
    "2026-11": {
      previous: "2026-10",
      groups: [
        ["11000000", 450],
        ["19000000", 90],
      ],
    },
    "2026-10": {
      previous: "2026-09",
      groups: [
        ["11000000", 800],
        ["19000000", 210],
      ],
    },
    "2026-09": {
      previous: "2026-08",
      groups: [
        ["11000000", 760],
        ["19000000", 190],
      ],
    },
    "2026-08": { previous: "2026-07", groups: [["11000000", 840]] },
  };

function spending(key = "2026-11") {
  const month = months[key];
  return {
    month: {
      key,
      label: key,
      previousKey: month.previous,
      isCurrent: key === "2026-11",
    },
    groups: month.groups.map(([groupKey, amount]) => ({
      key: groupKey,
      label: groupKey === "11000000" ? "Alimentação" : "Transporte",
      icon: "🍽️",
      amount,
    })),
    total: 0,
    error: null,
  };
}

describe("budget actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategorySpending.mockImplementation(async (key?: string) =>
      spending(key),
    );
  });

  it("evaluates saved budgets and suggests the rest from three past months", async () => {
    mocks.findMany.mockResolvedValue([
      { categoryGroupId: "11000000", amount: 600 },
    ]);

    const overview = await getBudgetsOverview(new Date("2026-11-15T15:00:00Z"));

    expect(overview.budgets).toEqual([
      expect.objectContaining({
        groupId: "11000000",
        spent: 450,
        amount: 600,
        status: "warning",
        projected: 900,
      }),
    ]);
    expect(overview.suggestions).toEqual([
      expect.objectContaining({
        groupId: "19000000",
        suggested: 200,
        spentThisMonth: 90,
      }),
    ]);
    expect(mocks.getCategorySpending).toHaveBeenCalledTimes(4);
  });

  it("saves amounts typed in Brazilian format and ignores unknown groups", async () => {
    const form = new FormData();
    form.set("groupId", "11000000");
    form.set("amount", "1.250,50");
    await saveBudget(form);

    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { categoryGroupId: "11000000" },
      create: { categoryGroupId: "11000000", amount: 1250.5 },
      update: { amount: 1250.5 },
    });

    const invalid = new FormData();
    invalid.set("groupId", "nope");
    invalid.set("amount", "10");
    await saveBudget(invalid);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);

    const remove = new FormData();
    remove.set("groupId", "11000000");
    await removeBudget(remove);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { categoryGroupId: "11000000" },
    });
  });
});
