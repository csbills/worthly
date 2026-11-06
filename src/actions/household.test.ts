import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profileUpsert: vi.fn(),
  profileFind: vi.fn(),
  obligationCreate: vi.fn(),
  obligationUpdate: vi.fn(),
  memberFind: vi.fn(),
  itemUpdate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialProfile: {
      upsert: mocks.profileUpsert,
      findUnique: mocks.profileFind,
    },
    obligation: {
      create: mocks.obligationCreate,
      updateMany: mocks.obligationUpdate,
    },
    householdMember: { findUnique: mocks.memberFind },
    pluggyItem: { updateMany: mocks.itemUpdate },
  },
}));

import {
  assignConnectionOwner,
  getFinancialProfile,
  saveFinancialProfile,
  saveObligation,
} from "./household";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("household actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the defaults until the profile is saved", async () => {
    mocks.profileFind.mockResolvedValue(null);
    await expect(getFinancialProfile()).resolves.toMatchObject({
      saved: false,
      expectedRealReturn: 4,
    });
  });

  it("saves the profile and keeps assumptions in a realistic range", async () => {
    await saveFinancialProfile(
      form({
        householdType: "couple",
        dependents: "1",
        incomeStability: "stable",
        incomeEarners: "2",
        birthYear: "1992",
        mainGoal: "independence",
        targetIndependenceAge: "55",
        desiredMonthlyCost: "9.000,00",
        expectedRealReturn: "25",
        withdrawalRate: "1",
        emergencyMonths: "",
        notes: "Queremos ter um filho em 2028",
      }),
    );

    expect(mocks.profileUpsert.mock.calls[0]?.[0].update).toEqual({
      householdType: "couple",
      dependents: 1,
      incomeStability: "stable",
      incomeEarners: 2,
      birthYear: 1992,
      mainGoal: "independence",
      targetIndependenceAge: 55,
      desiredMonthlyCost: 9000,
      expectedRealReturn: 10,
      withdrawalRate: 2,
      emergencyMonths: null,
      notes: "Queremos ter um filho em 2028",
    });
  });

  it("saves obligations with optional end month, balance and rate", async () => {
    await saveObligation(
      form({
        name: "Financiamento do apê",
        kind: "financing",
        monthlyAmount: "3.150,40",
        endMonth: "2034-06",
        balance: "220000",
        interestRate: "10,5",
      }),
    );
    expect(mocks.obligationCreate).toHaveBeenCalledWith({
      data: {
        name: "Financiamento do apê",
        kind: "financing",
        monthlyAmount: 3150.4,
        endMonth: "2034-06",
        balance: 220000,
        interestRate: 10.5,
      },
    });

    await saveObligation(form({ name: "Sem valor", monthlyAmount: "" }));
    expect(mocks.obligationCreate).toHaveBeenCalledTimes(1);
  });

  it("assigns a connection only to an existing member", async () => {
    mocks.memberFind.mockResolvedValue({ id: "ana" });
    await assignConnectionOwner(form({ itemId: "item-1", memberId: "ana" }));
    expect(mocks.itemUpdate).toHaveBeenLastCalledWith({
      where: { itemId: "item-1" },
      data: { memberId: "ana" },
    });

    mocks.memberFind.mockResolvedValue(null);
    await assignConnectionOwner(form({ itemId: "item-1", memberId: "ghost" }));
    expect(mocks.itemUpdate).toHaveBeenLastCalledWith({
      where: { itemId: "item-1" },
      data: { memberId: null },
    });
  });
});
