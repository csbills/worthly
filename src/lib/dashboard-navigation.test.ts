import { describe, expect, it } from "vitest";

import {
  dashboardNavigationItems,
  isDashboardNavigationItemActive,
} from "./dashboard-navigation";

describe("dashboard navigation", () => {
  it("contains every functional destination from the former sidebar", () => {
    expect(dashboardNavigationItems.map((item) => item.href)).toEqual([
      "/",
      "/investments",
      "/accounts",
      "/transactions",
      "/installments",
      "/subscriptions",
      "/categories",
      "/credit-cards",
    ]);
  });

  it("matches the current route without treating every route as the overview", () => {
    expect(isDashboardNavigationItemActive("/", "/")).toBe(true);
    expect(isDashboardNavigationItemActive("/", "/transactions")).toBe(false);
    expect(
      isDashboardNavigationItemActive("/transactions", "/transactions"),
    ).toBe(true);
    expect(
      isDashboardNavigationItemActive("/transactions", "/transactions/details"),
    ).toBe(true);
    expect(
      isDashboardNavigationItemActive("/transactions", "/credit-cards"),
    ).toBe(false);
  });
});
