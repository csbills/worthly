import { describe, expect, it } from "vitest";

import {
  compactToolResult,
  parseEmptyToolInput,
  parseMonthToolInput,
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
});
