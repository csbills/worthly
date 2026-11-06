import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  proposalCreate: vi.fn(),
  proposalFind: vi.fn(),
  proposalUpdate: vi.fn(),
  goalCreate: vi.fn(),
  budgetUpsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  const tx = {
    goal: { create: mocks.goalCreate },
    budget: { upsert: mocks.budgetUpsert },
    assistantProposal: { update: mocks.proposalUpdate },
  };
  return {
    prisma: {
      assistantProposal: {
        create: mocks.proposalCreate,
        findUnique: mocks.proposalFind,
        update: mocks.proposalUpdate,
        findMany: vi.fn(async () => []),
      },
      $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx),
    },
  };
});
vi.mock("@/actions/financial-plan", () => ({
  getFinancialPlan: async () => ({
    baseline: {
      savingsCapacity: 2500,
      groups: [
        {
          groupId: "21000000",
          label: "Lazer",
          icon: "🎟️",
          essential: false,
          monthlyTypical: 900,
        },
        {
          groupId: "17000000",
          label: "Moradia",
          icon: "🏠",
          essential: true,
          monthlyTypical: 3000,
        },
        {
          groupId: "05000000",
          label: "Transferências",
          icon: "↔️",
          essential: false,
          monthlyTypical: 2000,
        },
      ],
    },
    plan: { emergency: { gap: 0 } },
  }),
}));
vi.mock("@/actions/goals", () => ({
  listGoals: async () => [
    {
      id: "g1",
      name: "Notebook",
      emoji: "💻",
      targetAmount: 3000,
      savedAmount: 1000,
      targetDate: "2027-01",
      done: false,
    },
    {
      id: "g2",
      name: "Sem data",
      emoji: "🎯",
      targetAmount: 100,
      savedAmount: 0,
      targetDate: null,
      done: false,
    },
  ],
}));

import {
  applyProposal,
  createGoalProposal,
  dismissProposal,
  scheduleGoals,
} from "./goal-proposals";

const car = {
  name: "Carro",
  emoji: "🚗",
  targetAmount: 25000,
  savedAmount: 0,
  targetMonth: "2027-10",
  priority: 1,
};

const now = new Date("2026-11-06T15:00:00Z");

describe("goal proposals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("plans new goals together with dated goals that already exist", async () => {
    const { schedule, payload } = await scheduleGoals(
      [{ ...car, targetAmount: 30000 }],
      now,
    );

    expect(
      schedule.outcomes.map((outcome) => [outcome.name, outcome.isNew]),
    ).toEqual([
      ["Notebook", false],
      ["Carro", true],
    ]);
    // Só gastos de escolha viram economia: nem moradia nem transferências.
    expect(schedule.savings.map((saving) => saving.groupId)).toEqual([
      "21000000",
    ]);
    expect(payload.budgets).toEqual([
      { groupId: "21000000", label: "Lazer", icon: "🎟️", amount: 720 },
    ]);
  });

  it("stores the validated payload and the engine's schedule", async () => {
    mocks.proposalCreate.mockImplementation(async ({ data }) => ({
      id: "p1",
      status: "pending",
      createdAt: now,
      ...data,
    }));

    const proposal = await createGoalProposal([car], now);

    expect(proposal).toMatchObject({
      id: "p1",
      status: "pending",
      kind: "goals",
    });
    expect(
      JSON.parse(mocks.proposalCreate.mock.calls[0]?.[0].data.payload).goals,
    ).toEqual([car]);
  });

  it("applies a pending proposal once, with optional budgets", async () => {
    const row = {
      id: "p1",
      kind: "goals",
      status: "pending",
      createdAt: now,
      payload: JSON.stringify({
        goals: [car],
        budgets: [
          { groupId: "21000000", label: "Lazer", icon: "🎟️", amount: 720 },
        ],
      }),
      schedule: JSON.stringify({ outcomes: [] }),
    };
    mocks.proposalFind.mockResolvedValue(row);
    mocks.proposalUpdate.mockImplementation(async ({ data }) => ({
      ...row,
      ...data,
    }));

    await expect(
      applyProposal("p1", { includeBudgets: true }),
    ).resolves.toMatchObject({
      ok: true,
      proposal: { status: "applied" },
    });
    expect(mocks.goalCreate).toHaveBeenCalledWith({
      data: {
        name: "Carro",
        emoji: "🚗",
        targetAmount: 25000,
        savedAmount: 0,
        targetDate: "2027-10",
      },
    });
    expect(mocks.budgetUpsert).toHaveBeenCalledWith({
      where: { categoryGroupId: "21000000" },
      create: { categoryGroupId: "21000000", amount: 720 },
      update: { amount: 720 },
    });

    mocks.proposalFind.mockResolvedValue({ ...row, status: "applied" });
    await expect(applyProposal("p1")).resolves.toMatchObject({ ok: false });
    await expect(dismissProposal("p1")).resolves.toMatchObject({ ok: false });
    expect(mocks.goalCreate).toHaveBeenCalledTimes(1);
  });
});
