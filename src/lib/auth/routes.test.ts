import { describe, expect, it } from "vitest";

import { getProxyRedirect, safeNextPath } from "./routes";

describe("getProxyRedirect", () => {
  it("sends visitors without a session cookie to the login", () => {
    expect(getProxyRedirect("/", false)).toBe("/login");
    expect(getProxyRedirect("/transactions", false)).toBe("/login");
    expect(getProxyRedirect("/onboarding", false)).toBe("/login");
  });

  it("lets the auth pages and PWA assets through without a session", () => {
    for (const path of [
      "/login",
      "/signup",
      "/manifest.webmanifest",
      "/sw.js",
      "/icon-192.png",
      "/apple-icon.png",
      "/offline",
    ]) {
      expect(getProxyRedirect(path, false), path).toBeNull();
    }
  });

  it("does not redirect requests that carry a session cookie", () => {
    expect(getProxyRedirect("/", true)).toBeNull();
    expect(getProxyRedirect("/login", true)).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeNextPath("/transactions?month=2026-10")).toBe(
      "/transactions?month=2026-10",
    );
  });

  it("falls back to the overview for anything that could leave the app", () => {
    for (const value of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "transactions",
      "/unlock",
      "/login",
    ]) {
      expect(safeNextPath(value), String(value)).toBe("/");
    }
  });
});
