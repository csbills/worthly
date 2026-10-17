import { describe, expect, it } from "vitest";

import {
  getInitialOnboardingStep,
  isValidPluggyItemId,
  maskIdentifier,
} from "./onboarding";

describe("isValidPluggyItemId", () => {
  it("accepts the UUID Pluggy shows in “Copiar Item ID”", () => {
    expect(isValidPluggyItemId("0b3c5e6a-1d2f-4a9b-8c7d-6e5f4a3b2c1d")).toBe(
      true,
    );
    expect(isValidPluggyItemId("  0B3C5E6A-1D2F-4A9B-8C7D-6E5F4A3B2C1D ")).toBe(
      true,
    );
  });

  it("rejects anything that is not an item id", () => {
    expect(isValidPluggyItemId("")).toBe(false);
    expect(isValidPluggyItemId("my-client-secret")).toBe(false);
    expect(isValidPluggyItemId("0b3c5e6a1d2f4a9b8c7d6e5f4a3b2c1d")).toBe(false);
  });
});

describe("maskIdentifier", () => {
  it("keeps only the edges of a credential visible", () => {
    expect(maskIdentifier("0b3c5e6a-1d2f-4a9b-8c7d-6e5f4a3b2c1d")).toBe(
      "0b3c…2c1d",
    );
  });

  it("fully hides short values", () => {
    expect(maskIdentifier("abc123")).toBe("••••");
  });
});

describe("getInitialOnboardingStep", () => {
  it("starts at the welcome screen on a fresh install", () => {
    expect(
      getInitialOnboardingStep({ hasCredentials: false, connectionCount: 0 }),
    ).toBe("welcome");
  });

  it("jumps to the item id step once credentials exist", () => {
    expect(
      getInitialOnboardingStep({ hasCredentials: true, connectionCount: 0 }),
    ).toBe("connect");
  });

  it("lands on the finish step when everything is configured", () => {
    expect(
      getInitialOnboardingStep({ hasCredentials: true, connectionCount: 2 }),
    ).toBe("done");
  });
});
