import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { goal: mocks } }));

import { addToGoal, createGoal, listGoals } from "./goals";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("goal actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a goal from the form", async () => {
    await createGoal(
      form({
        name: " Viagem para Lisboa ",
        emoji: "✈️",
        targetAmount: "12.000,00",
        savedAmount: "1500",
        targetDate: "2027-06",
      }),
    );

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        name: "Viagem para Lisboa",
        emoji: "✈️",
        targetAmount: 12000,
        savedAmount: 1500,
        targetDate: "2027-06",
      },
    });
  });

  it("ignores goals without a name or a positive target", async () => {
    await createGoal(form({ name: "", targetAmount: "100" }));
    await createGoal(form({ name: "X", targetAmount: "0" }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("adds and withdraws money, marking the goal done when it is reached", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "g1",
      savedAmount: 900,
      targetAmount: 1000,
      completedAt: null,
    });

    await addToGoal(form({ goalId: "g1", amount: "150" }));
    expect(mocks.update).toHaveBeenLastCalledWith({
      where: { id: "g1" },
      data: { savedAmount: 1050, completedAt: expect.any(Date) },
    });

    await addToGoal(form({ goalId: "g1", amount: "-2000" }));
    expect(mocks.update).toHaveBeenLastCalledWith({
      where: { id: "g1" },
      data: { savedAmount: 0, completedAt: null },
    });
  });

  it("lists goals with their progress", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "g1",
        name: "Reserva",
        emoji: "🛟",
        targetAmount: 10000,
        savedAmount: 2500,
        targetDate: null,
      },
    ]);

    await expect(listGoals(new Date("2026-11-05T12:00:00Z"))).resolves.toEqual([
      expect.objectContaining({ id: "g1", progress: 0.25, remaining: 7500 }),
    ]);
  });
});
