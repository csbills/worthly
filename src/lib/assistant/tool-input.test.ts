import { describe, expect, it } from "vitest";

import {
  compactToolResult,
  parseEmptyToolInput,
  parseGoalProposalInput,
  parseMonthToolInput,
  parseSimulationToolInput,
  parseTransactionsToolInput,
} from "./tool-input";

describe("assistant tool input", () => {
  it("fills transaction defaults", () => {
    expect(parseTransactionsToolInput({})).toEqual({
      ok: true,
      value: {
        period: "current-month",
        dateFrom: null,
        dateTo: null,
        search: "",
        type: "all",
        category: null,
        limit: 50,
      },
    });
  });

  it("switches to a custom period when dates are given and caps the limit", () => {
    expect(
      parseTransactionsToolInput({
        date_from: "2026-01-01",
        date_to: "2026-02-01",
        search: " ifood ",
        type: "DEBIT",
        limit: 900,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        period: "custom",
        dateFrom: "2026-01-01",
        dateTo: "2026-02-01",
        search: "ifood",
        type: "DEBIT",
        limit: 200,
      },
    });
  });

  it("rejects malformed transaction input", () => {
    expect(parseTransactionsToolInput("x")).toMatchObject({ ok: false });
    expect(parseTransactionsToolInput({ period: "yesterday" })).toMatchObject({
      ok: false,
    });
    expect(
      parseTransactionsToolInput({ date_from: "01/01/2026" }),
    ).toMatchObject({ ok: false });
    expect(parseTransactionsToolInput({ type: "PIX" })).toMatchObject({
      ok: false,
    });
    expect(parseTransactionsToolInput({ limit: 2.5 })).toMatchObject({
      ok: false,
    });
  });

  it("validates month keys", () => {
    expect(parseMonthToolInput({ month: "2026-10" })).toEqual({
      ok: true,
      value: { month: "2026-10" },
    });
    expect(parseMonthToolInput({})).toEqual({
      ok: true,
      value: { month: null },
    });
    expect(parseMonthToolInput({ month: "2026-13" })).toMatchObject({
      ok: false,
    });
    expect(parseEmptyToolInput(null)).toMatchObject({ ok: false });
  });

  it("compacts results for the model", () => {
    expect(
      compactToolResult(
        {
          amount: 10.456,
          bankLogoPath: "/x.svg",
          items: [1, 2, 3],
          nested: { color: "#fff", label: "ok" },
        },
        2,
      ),
    ).toEqual({
      amount: 10.46,
      items: [1, 2, "… e mais 1 itens"],
      nested: { label: "ok" },
    });
  });
  it("validates plan simulations", () => {
    expect(parseSimulationToolInput({})).toEqual({
      ok: true,
      value: {
        extraMonthly: 0,
        desiredMonthlyCost: null,
        targetAge: null,
        realReturn: null,
      },
    });
    expect(
      parseSimulationToolInput({ extra_monthly: 500, target_age: 50 }),
    ).toMatchObject({ ok: true, value: { extraMonthly: 500, targetAge: 50 } });
    expect(parseSimulationToolInput({ extra_monthly: "500" })).toMatchObject({
      ok: false,
    });
    expect(parseSimulationToolInput({ real_return: 15 })).toMatchObject({
      ok: false,
    });
    expect(parseSimulationToolInput({ target_age: 20 })).toMatchObject({
      ok: false,
    });
  });
  it("validates goal proposals strictly", () => {
    const now = new Date("2026-11-06T12:00:00Z");

    expect(
      parseGoalProposalInput(
        {
          goals: [
            {
              name: " Carro ",
              target_amount: 25000,
              target_month: "2027-10",
              priority: 2,
              emoji: "🚗",
            },
            { name: "Cozinha", target_amount: 7000, target_month: "2027-03" },
          ],
        },
        now,
      ),
    ).toEqual({
      ok: true,
      value: {
        goals: [
          {
            name: "Carro",
            emoji: "🚗",
            targetAmount: 25000,
            savedAmount: 0,
            targetMonth: "2027-10",
            priority: 2,
          },
          {
            name: "Cozinha",
            emoji: "🎯",
            targetAmount: 7000,
            savedAmount: 0,
            targetMonth: "2027-03",
            priority: 2,
          },
        ],
      },
    });

    const bad = (goals: unknown) => parseGoalProposalInput({ goals }, now).ok;
    expect(bad([])).toBe(false);
    expect(bad([{ name: "", target_amount: 1, target_month: "2027-01" }])).toBe(
      false,
    );
    expect(
      bad([{ name: "X", target_amount: -5, target_month: "2027-01" }]),
    ).toBe(false);
    expect(
      bad([{ name: "X", target_amount: "25 mil", target_month: "2027-01" }]),
    ).toBe(false);
    expect(
      bad([{ name: "X", target_amount: 10, target_month: "2026-11" }]),
    ).toBe(false);
    expect(
      bad([{ name: "X", target_amount: 10, target_month: "2027-1" }]),
    ).toBe(false);
    expect(
      bad([
        {
          name: "X",
          target_amount: 10,
          saved_amount: 20,
          target_month: "2027-01",
        },
      ]),
    ).toBe(false);
    expect(
      bad([
        { name: "X", target_amount: 10, target_month: "2027-01" },
        { name: "x", target_amount: 10, target_month: "2027-02" },
      ]),
    ).toBe(false);
    expect(parseGoalProposalInput({ goals: "carro" }, now).ok).toBe(false);
  });
});
