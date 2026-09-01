import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/spending-pace-chart", () => ({
  SpendingPaceChart: () => <div data-testid="spending-chart" />,
}));

import { SpendingPaceCard } from "./spending-pace-card";

describe("SpendingPaceCard", () => {
  it("renders the spending comparison and its chart", () => {
    const markup = renderToStaticMarkup(
      <SpendingPaceCard
        currentMonth={{
          key: "2026-08",
          label: "agosto de 2026",
          total: 300,
          daysInMonth: 31,
          elapsedDays: 29,
        }}
        previousMonth={{
          key: "2026-07",
          label: "julho de 2026",
          total: 250,
          daysInMonth: 31,
        }}
        points={[{ day: 1, current: 300, previous: 250 }]}
        error={null}
      />,
    );
    const normalizedMarkup = markup.replace(/\u00a0/gu, " ");

    expect(normalizedMarkup).toContain("R$ 50,00");
    expect(normalizedMarkup).toContain("acima");
    expect(normalizedMarkup).toContain("+20,0%");
    expect(normalizedMarkup).toContain('data-testid="spending-chart"');
  });
});
