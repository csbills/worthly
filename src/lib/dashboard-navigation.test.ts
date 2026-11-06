import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  dashboardNavigationItems,
  isDashboardNavigationItemActive,
} from "./dashboard-navigation";

describe("dashboard navigation", () => {
  it("does not expose a separate installments route", () => {
    expect(
      dashboardNavigationItems.some(
        (item) => (item.href as string) === "/installments",
      ),
    ).toBe(false);
  });

  it("only links to routes that have a page", () => {
    for (const item of dashboardNavigationItems) {
      const page = path.join(
        process.cwd(),
        "src/app/(dashboard)",
        item.href,
        "page.tsx",
      );
      expect(existsSync(page), item.href).toBe(true);
    }
  });

  it("keeps the tab bar small enough for a phone, with the assistant in it", () => {
    expect(dashboardNavigationItems.length).toBeLessThanOrEqual(6);
    expect(dashboardNavigationItems.map((item) => item.href)).toContain(
      "/assistant",
    );
  });

  it("matches nested routes but keeps the overview exact", () => {
    expect(isDashboardNavigationItemActive("/", "/")).toBe(true);
    expect(isDashboardNavigationItemActive("/", "/accounts")).toBe(false);
    expect(isDashboardNavigationItemActive("/assistant", "/assistant/x")).toBe(
      true,
    );
  });
  it("keeps Planejar active on the categories page", () => {
    expect(isDashboardNavigationItemActive("/planning", "/categories")).toBe(
      true,
    );
    expect(isDashboardNavigationItemActive("/planning", "/transactions")).toBe(
      false,
    );
  });
});
