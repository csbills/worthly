import { describe, expect, it } from "vitest";

import { dashboardNavigationItems } from "./dashboard-navigation";

describe("dashboard navigation", () => {
  it("does not expose a separate installments route", () => {
    expect(
      dashboardNavigationItems.some(
        (item) => (item.href as string) === "/installments",
      ),
    ).toBe(false);
  });
});
