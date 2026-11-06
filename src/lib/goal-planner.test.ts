import { describe, expect, it } from "vitest";

import { type PlannerGoal, planGoals } from "./goal-planner";

const now = new Date("2026-11-06T15:00:00Z");

const goals2027: PlannerGoal[] = [
  {
    key: "cozinha",
    name: "Reforma da cozinha",
    emoji: "🍳",
    targetAmount: 7000,
    savedAmount: 0,
    targetMonth: "2027-03",
    priority: 1,
    isNew: true,
  },
  {
    key: "carro",
    name: "Carro",
    emoji: "🚗",
    targetAmount: 25000,
    savedAmount: 0,
    targetMonth: "2027-10",
    priority: 2,
    isNew: true,
  },
  {
    key: "viagem",
    name: "Viagem",
    emoji: "✈️",
    targetAmount: 12000,
    savedAmount: 0,
    targetMonth: "2027-12",
    priority: 3,
    isNew: true,
  },
];

const sources = [
  { groupId: "21000000", label: "Lazer", icon: "🎟️", monthlyTypical: 900 },
  { groupId: "08000000", label: "Compras", icon: "🛍️", monthlyTypical: 700 },
  {
    groupId: "11000000",
    label: "Alimentos e bebidas",
    icon: "🍽️",
    monthlyTypical: 1400,
  },
];

describe("planGoals", () => {
  it("fits all 2027 goals when the household saves enough, nearest deadline first", () => {
    const schedule = planGoals({
      goals: goals2027,
      monthlyCapacity: 4000,
      emergencyGap: 0,
      savingsSources: sources,
      now,
    });

    expect(schedule).toMatchObject({
      feasible: true,
      extraNeeded: 0,
      savings: [],
      coversShortfall: true,
      adjustedDates: [],
    });
    expect(
      schedule.outcomes.map((o) => [o.key, o.completionMonth, o.onTime]),
    ).toEqual([
      ["cozinha", "2027-01", true],
      ["carro", "2027-07", true],
      ["viagem", "2027-10", true],
    ]);
    expect(schedule.phases[0]).toEqual({
      from: "2026-12",
      to: "2026-12",
      allocations: [
        { key: "cozinha", name: "Reforma da cozinha", amount: 4000 },
      ],
      leftover: 0,
    });
  });

  it("asks for a realistic monthly extra, suggests savings and new dates when short", () => {
    const schedule = planGoals({
      goals: goals2027,
      monthlyCapacity: 2500,
      emergencyGap: 0,
      savingsSources: sources,
      now,
    });

    expect(schedule.feasible).toBe(false);
    expect(schedule.extraNeeded).toBe(890);
    expect(schedule.savings).toEqual([
      {
        groupId: "11000000",
        label: "Alimentos e bebidas",
        icon: "🍽️",
        typical: 1400,
        cut: 280,
      },
      {
        groupId: "21000000",
        label: "Lazer",
        icon: "🎟️",
        typical: 900,
        cut: 180,
      },
      {
        groupId: "08000000",
        label: "Compras",
        icon: "🛍️",
        typical: 700,
        cut: 140,
      },
    ]);
    expect(schedule.savingsTotal).toBe(600);
    expect(schedule.coversShortfall).toBe(false);
    // A viagem, menos prioritária e de prazo mais distante, é a que se move.
    expect(schedule.adjustedDates.map((item) => item.key)).toEqual(["viagem"]);
    expect(schedule.adjustedDates[0]?.to > "2027-12").toBe(true);
    expect(schedule.outcomes.find((o) => o.key === "cozinha")?.onTime).toBe(
      true,
    );
  });

  it("keeps funding the emergency reserve while saving for goals", () => {
    const schedule = planGoals({
      goals: [goals2027[0]],
      monthlyCapacity: 4000,
      emergencyGap: 6000,
      savingsSources: [],
      now,
    });

    expect(schedule.emergency).toEqual({
      monthly: 2000,
      untilMonth: "2027-02",
    });
    expect(schedule.phases[0]?.allocations).toEqual([
      { key: "cozinha", name: "Reforma da cozinha", amount: 2000 },
    ]);
    expect(schedule.outcomes[0]).toMatchObject({
      completionMonth: "2027-03",
      onTime: true,
    });
  });

  it("counts money already saved and handles goals already reached", () => {
    const schedule = planGoals({
      goals: [{ ...goals2027[0], savedAmount: 7000 }],
      monthlyCapacity: 1000,
      emergencyGap: 0,
      savingsSources: [],
      now,
    });

    expect(schedule.outcomes[0]).toMatchObject({ remaining: 0, onTime: true });
    expect(schedule.phases).toEqual([]);
  });
});
