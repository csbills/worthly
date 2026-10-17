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
      const page = path.join(process.cwd(), "src/app", item.href, "page.tsx");
      expect(existsSync(page), item.href).toBe(true);
    }
  });

  it("matches nested routes but keeps the overview exact", () => {
    expect(isDashboardNavigationItemActive("/", "/")).toBe(true);
    expect(isDashboardNavigationItemActive("/", "/accounts")).toBe(false);
    expect(isDashboardNavigationItemActive("/accounts", "/accounts/x")).toBe(
      true,
    );
  });
});
