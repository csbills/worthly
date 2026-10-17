import { describe, expect, it } from "vitest";

import { getProxyRedirect } from "./routes";

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
